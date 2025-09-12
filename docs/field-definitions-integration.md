# Gravity Forms MCP Server - Field Definitions Integration Strategy

## Executive Summary

This document outlines how the gravity-mcp should integrate with the gravity-forms-field-definitions to ensure 100% valid structure for forms, entries, and JSON data. By leveraging the TypeScript field definitions as the single source of truth, the MCP server can provide comprehensive validation, intelligent field handling, and type-safe operations.

## Current State Analysis

### MCP Server Capabilities
- 24 tools covering 100% of Gravity Forms REST API v2
- Basic validation for IDs, statuses, and general parameters
- Generic field handling without type-specific awareness
- No field-specific validation rules
- No understanding of field variants or storage patterns

### Field Definitions Assets
- Complete TypeScript definitions for all 50+ field types
- Field variants with discriminated unions
- Storage patterns and retrieval methods
- Hook configurations and cascade patterns
- Validation schemas with runtime rules
- Examples and documentation

## Integration Architecture

### 1. Field Definition Loader Module

Create a new module that loads and processes field definitions at runtime:

```javascript
// src/field-definitions/loader.js
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class FieldDefinitionLoader {
  constructor() {
    this.definitions = new Map();
    this.fieldPath = this.findFieldDefinitions();
    this.loadDefinitions();
  }

  findFieldDefinitions() {
    // Look for field definitions in multiple locations
    const possiblePaths = [
      // Direct path in MonoKit structure
      join(__dirname, '../../../../Development/Gravity-Forms/gravity-forms-field-definitions'),
      // As a dependency
      join(__dirname, '../../node_modules/@gravitykit/gravity-forms-field-definitions'),
      // Environment variable override
      process.env.GF_FIELD_DEFINITIONS_PATH
    ];

    for (const path of possiblePaths.filter(Boolean)) {
      if (existsSync(join(path, 'dist/index.js'))) {
        return path;
      }
    }

    throw new Error('Gravity Forms field definitions not found. Please ensure they are available.');
  }

  async loadDefinitions() {
    try {
      // Dynamically import the compiled definitions
      const { fieldRegistry } = await import(join(this.fieldPath, 'dist/index.js'));
      
      // Load all field types
      for (const [fieldType, definition] of fieldRegistry.entries()) {
        this.definitions.set(fieldType, definition);
      }

      console.log(`Loaded ${this.definitions.size} field type definitions`);
    } catch (error) {
      console.error('Failed to load field definitions:', error);
      // Fall back to basic validation
      this.useBasicValidation = true;
    }
  }

  getFieldDefinition(type) {
    return this.definitions.get(type);
  }

  getAllFieldTypes() {
    return Array.from(this.definitions.keys());
  }
}
```

### 2. Enhanced Validation System

Extend the current validation.js to incorporate field-specific rules:

```javascript
// src/config/field-validation.js
import { FieldDefinitionLoader } from '../field-definitions/loader.js';

export class FieldAwareValidator {
  constructor() {
    this.fieldLoader = new FieldDefinitionLoader();
  }

  /**
   * Validate form fields structure
   */
  validateFormFields(fields) {
    if (!Array.isArray(fields)) {
      throw new Error('Fields must be an array');
    }

    return fields.map((field, index) => {
      return this.validateField(field, `fields[${index}]`);
    });
  }

  /**
   * Validate individual field configuration
   */
  validateField(field, path = 'field') {
    // Get field definition
    const definition = this.fieldLoader.getFieldDefinition(field.type);
    
    if (!definition) {
      console.warn(`Unknown field type: ${field.type} at ${path}`);
      return field; // Allow unknown types but warn
    }

    const validated = { ...field };

    // Apply type-specific validation
    const validationResult = this.applyFieldValidation(field, definition, path);
    
    if (!validationResult.isValid) {
      throw new Error(`Field validation failed at ${path}: ${validationResult.message}`);
    }

    // Validate field variants
    if (definition.variants) {
      validated.variant = this.detectFieldVariant(field, definition);
    }

    // Validate conditional logic if supported
    if (definition.meta.supportsConditionalLogic && field.conditionalLogic) {
      this.validateConditionalLogic(field.conditionalLogic, path);
    }

    return validated;
  }

  /**
   * Apply field-specific validation rules
   */
  applyFieldValidation(field, definition, path) {
    // Use the field's validation schema
    if (definition.validation && definition.validation.rules) {
      for (const rule of definition.validation.rules) {
        const result = rule.validator(field.defaultValue, field);
        if (!result.isValid) {
          return {
            isValid: false,
            message: `${path}: ${result.message}`
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Detect which variant of a field is being used
   */
  detectFieldVariant(field, definition) {
    if (!definition.variants) {
      return 'default';
    }

    // Check each variant's settings to find a match
    for (const [variantId, variant] of Object.entries(definition.variants)) {
      const isMatch = Object.entries(variant.settings || {}).every(([key, value]) => {
        return field[key] === value;
      });

      if (isMatch) {
        return variantId;
      }
    }

    return 'default';
  }

  /**
   * Validate conditional logic structure
   */
  validateConditionalLogic(logic, path) {
    if (!logic || typeof logic !== 'object') {
      throw new Error(`${path}: Conditional logic must be an object`);
    }

    if (!['show', 'hide'].includes(logic.actionType)) {
      throw new Error(`${path}: Conditional logic actionType must be 'show' or 'hide'`);
    }

    if (!['all', 'any'].includes(logic.logicType)) {
      throw new Error(`${path}: Conditional logic logicType must be 'all' or 'any'`);
    }

    if (!Array.isArray(logic.rules)) {
      throw new Error(`${path}: Conditional logic rules must be an array`);
    }
  }
}
```

### 3. Entry Data Validation

Validate entry data based on field types and storage patterns:

```javascript
// src/validation/entry-validator.js
export class EntryDataValidator {
  constructor(fieldLoader) {
    this.fieldLoader = fieldLoader;
  }

  /**
   * Validate entry data against form fields
   */
  async validateEntryData(entryData, form) {
    const validated = { ...entryData };
    const errors = [];

    for (const field of form.fields) {
      const definition = this.fieldLoader.getFieldDefinition(field.type);
      
      if (!definition) {
        continue; // Skip unknown field types
      }

      // Get the field value from entry data
      const value = this.getFieldValue(entryData, field, definition);
      
      // Validate based on storage pattern
      const validationResult = this.validateFieldValue(value, field, definition);
      
      if (!validationResult.isValid) {
        errors.push({
          fieldId: field.id,
          fieldType: field.type,
          error: validationResult.message
        });
      }

      // Apply storage transformation if needed
      if (definition.storage && definition.storage.serialize) {
        validated[field.id] = definition.storage.serialize(value);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Entry validation failed: ${JSON.stringify(errors)}`);
    }

    return validated;
  }

  /**
   * Get field value handling compound fields
   */
  getFieldValue(entryData, field, definition) {
    // Handle compound fields (address, name, etc.)
    if (definition.meta.isCompound) {
      const compoundValue = {};
      const fieldPrefix = `${field.id}.`;
      
      Object.keys(entryData).forEach(key => {
        if (key.startsWith(fieldPrefix)) {
          const subfield = key.substring(fieldPrefix.length);
          compoundValue[subfield] = entryData[key];
        }
      });
      
      return Object.keys(compoundValue).length > 0 ? compoundValue : entryData[field.id];
    }

    return entryData[field.id];
  }

  /**
   * Validate field value based on type
   */
  validateFieldValue(value, field, definition) {
    // Check if field is required
    if (field.isRequired && !value) {
      return {
        isValid: false,
        message: `Field ${field.id} is required`
      };
    }

    // Apply field-specific validation
    if (definition.validation && definition.validation.rules) {
      for (const rule of definition.validation.rules) {
        const result = rule.validator(value, field);
        if (!result.isValid) {
          return result;
        }
      }
    }

    // Validate based on field variant
    const variant = this.detectFieldVariant(field, definition);
    if (variant && definition.variants[variant]) {
      return this.validateVariantValue(value, field, definition.variants[variant]);
    }

    return { isValid: true };
  }

  /**
   * Validate value based on field variant
   */
  validateVariantValue(value, field, variant) {
    // Example: FileUpload with multipleFiles variant
    if (field.type === 'fileupload' && variant.settings.multipleFiles) {
      try {
        const files = JSON.parse(value);
        if (!Array.isArray(files)) {
          return {
            isValid: false,
            message: 'Multiple file upload field must contain JSON array'
          };
        }
      } catch (e) {
        return {
          isValid: false,
          message: 'Multiple file upload field must contain valid JSON'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Detect field variant
   */
  detectFieldVariant(field, definition) {
    if (!definition.variants) {
      return null;
    }

    for (const [variantId, variant] of Object.entries(definition.variants)) {
      const isMatch = Object.entries(variant.settings || {}).every(([key, value]) => {
        return field[key] === value;
      });

      if (isMatch) {
        return variantId;
      }
    }

    return 'default';
  }
}
```

### 4. Form Submission Processing

Handle form submissions with field-aware processing:

```javascript
// src/processing/submission-processor.js
export class SubmissionProcessor {
  constructor(fieldLoader) {
    this.fieldLoader = fieldLoader;
    this.entryValidator = new EntryDataValidator(fieldLoader);
  }

  /**
   * Process form submission with field-aware validation
   */
  async processSubmission(submissionData, form) {
    const processed = {
      form_id: form.id,
      date_created: new Date().toISOString(),
      status: 'active',
      field_values: {}
    };

    // Process each field
    for (const field of form.fields) {
      const definition = this.fieldLoader.getFieldDefinition(field.type);
      
      if (!definition) {
        // Handle unknown field type
        processed.field_values[field.id] = submissionData[`input_${field.id}`];
        continue;
      }

      // Get submission value
      const inputValue = this.extractSubmissionValue(submissionData, field, definition);
      
      // Apply field processing
      const processedValue = await this.processFieldValue(inputValue, field, definition);
      
      // Store based on storage pattern
      if (definition.meta.isCompound) {
        // Store compound fields with dot notation
        Object.entries(processedValue).forEach(([subfield, value]) => {
          processed.field_values[`${field.id}.${subfield}`] = value;
        });
      } else {
        processed.field_values[field.id] = processedValue;
      }
    }

    // Validate the complete entry
    await this.entryValidator.validateEntryData(processed.field_values, form);

    return processed;
  }

  /**
   * Extract submission value handling different input formats
   */
  extractSubmissionValue(submissionData, field, definition) {
    // Handle compound fields
    if (definition.meta.isCompound) {
      const value = {};
      const inputPrefix = `input_${field.id}_`;
      
      Object.keys(submissionData).forEach(key => {
        if (key.startsWith(inputPrefix)) {
          const subfield = key.substring(inputPrefix.length);
          value[subfield] = submissionData[key];
        }
      });
      
      return value;
    }

    // Handle array inputs (checkboxes, multi-select)
    if (definition.meta.isArray) {
      const values = [];
      let index = 1;
      
      while (submissionData[`input_${field.id}_${index}`] !== undefined) {
        values.push(submissionData[`input_${field.id}_${index}`]);
        index++;
      }
      
      return values.length > 0 ? values : submissionData[`input_${field.id}`];
    }

    return submissionData[`input_${field.id}`];
  }

  /**
   * Process field value based on type
   */
  async processFieldValue(value, field, definition) {
    // Apply field-specific processing
    if (definition.processing) {
      value = await definition.processing.process(value, field);
    }

    // Handle file uploads
    if (field.type === 'fileupload') {
      value = await this.processFileUpload(value, field, definition);
    }

    // Apply storage serialization
    if (definition.storage && definition.storage.serialize) {
      value = definition.storage.serialize(value);
    }

    return value;
  }

  /**
   * Process file upload fields
   */
  async processFileUpload(value, field, definition) {
    const variant = this.detectFieldVariant(field, definition);
    
    if (variant === 'multipleFiles') {
      // Multiple files should be stored as JSON array
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
    }
    
    // Single file stored as URL string
    return String(value);
  }

  detectFieldVariant(field, definition) {
    // Implementation same as in EntryDataValidator
    if (!definition.variants) {
      return 'default';
    }

    for (const [variantId, variant] of Object.entries(definition.variants)) {
      const isMatch = Object.entries(variant.settings || {}).every(([key, value]) => {
        return field[key] === value;
      });

      if (isMatch) {
        return variantId;
      }
    }

    return 'default';
  }
}
```

### 5. Integration Points

#### 5.1 Server Initialization

Update the main server to load field definitions on startup:

```javascript
// src/index.js - Addition to server initialization
import { FieldDefinitionLoader } from './field-definitions/loader.js';
import { FieldAwareValidator } from './config/field-validation.js';
import { SubmissionProcessor } from './processing/submission-processor.js';

// Initialize field definitions
const fieldLoader = new FieldDefinitionLoader();
const fieldValidator = new FieldAwareValidator();
const submissionProcessor = new SubmissionProcessor(fieldLoader);

// Make available to all tools
server.context = {
  ...server.context,
  fieldLoader,
  fieldValidator,
  submissionProcessor
};
```

#### 5.2 Tool Updates

Update relevant tools to use field-aware validation:

```javascript
// Example: gf_create_form tool update
{
  name: 'gf_create_form',
  description: 'Create a new form with field-aware validation',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      fields: { type: 'array' }
    },
    required: ['title']
  },
  handler: async (input) => {
    try {
      // Validate form data with field awareness
      if (input.fields) {
        input.fields = server.context.fieldValidator.validateFormFields(input.fields);
      }
      
      const result = await client.createForm(input);
      return {
        content: [{
          type: 'text',
          text: `Form created successfully with ID: ${result.id}`
        }],
        data: result
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
```

### 6. Benefits of Integration

#### 6.1 Type Safety
- Validate field configurations against known types
- Prevent invalid field settings
- Ensure proper variant usage

#### 6.2 Storage Accuracy
- Correctly handle compound fields (address, name)
- Proper JSON serialization for array fields
- Variant-aware storage (single vs multiple files)

#### 6.3 Validation Completeness
- Field-specific validation rules
- Required field enforcement
- Conditional logic validation

#### 6.4 Developer Experience
- IntelliSense support for field types
- Clear error messages with field context
- Automatic detection of field variants

#### 6.5 Runtime Safety
- Prevent data corruption
- Ensure API compatibility
- Validate before submission

## Implementation Plan

### Phase 1: Setup (Day 1)
1. Add field definitions as dependency or reference
2. Create field definition loader module
3. Test loading and accessing definitions

### Phase 2: Validation Integration (Day 2-3)
1. Extend validation system with field awareness
2. Implement field variant detection
3. Add compound field handling
4. Create validation test suite

### Phase 3: Entry Processing (Day 4-5)
1. Implement entry data validator
2. Add submission processor
3. Handle file upload variants
4. Test with all field types

### Phase 4: Tool Updates (Day 6-7)
1. Update form creation/update tools
2. Enhance entry creation/update tools
3. Improve submission tools
4. Add field-specific error messages

### Phase 5: Testing & Documentation (Day 8-9)
1. Comprehensive testing with all field types
2. Test all field variants
3. Validate compound field handling
4. Document integration patterns

### Phase 6: Performance & Polish (Day 10)
1. Optimize field definition loading
2. Add caching for frequently used definitions
3. Performance testing with large forms
4. Final documentation updates

## Testing Strategy

### Unit Tests
- Field definition loader
- Variant detection
- Compound field handling
- Storage serialization

### Integration Tests
- Form creation with all field types
- Entry submission with validation
- Field variant processing
- Error handling

### End-to-End Tests
- Complete form lifecycle
- Multi-page form submissions
- File upload processing
- Conditional logic evaluation

## Configuration

### Environment Variables
```env
# Optional: Override field definitions path
GF_FIELD_DEFINITIONS_PATH=/path/to/field-definitions

# Enable field validation (default: true)
GF_ENABLE_FIELD_VALIDATION=true

# Strict mode: Reject unknown field types (default: false)
GF_STRICT_FIELD_TYPES=false
```

### Package.json Updates
```json
{
  "dependencies": {
    "@gravitykit/gravity-forms-field-definitions": "^1.0.0"
  },
  "optionalDependencies": {
    "@gravitykit/gravity-forms-field-definitions": "^1.0.0"
  }
}
```

## Error Handling

### Field Validation Errors
```javascript
{
  "error": "Field validation failed",
  "details": [
    {
      "fieldId": "3",
      "fieldType": "email",
      "error": "Invalid email format"
    },
    {
      "fieldId": "5",
      "fieldType": "fileupload",
      "error": "Multiple file upload field must contain JSON array"
    }
  ]
}
```

### Unknown Field Types
```javascript
{
  "warning": "Unknown field type encountered",
  "fieldType": "custom_field",
  "action": "Processed with basic validation only"
}
```

## Monitoring & Metrics

### Track Usage
- Field types used
- Validation failures by type
- Unknown field types encountered
- Performance metrics

### Logging
```javascript
console.log('[FieldValidator] Loaded 55 field definitions');
console.log('[FieldValidator] Processing form with 12 fields');
console.warn('[FieldValidator] Unknown field type: custom_widget');
console.error('[FieldValidator] Validation failed for field 3 (email)');
```

## Migration Guide

### For Existing Implementations

1. **Install field definitions**
   ```bash
   npm install @gravitykit/gravity-forms-field-definitions
   ```

2. **Update server initialization**
   - Add field loader
   - Initialize validators
   - Update context

3. **Update tools gradually**
   - Start with form validation
   - Add entry validation
   - Enhance submission processing

4. **Test thoroughly**
   - Run existing tests
   - Add field-specific tests
   - Validate backwards compatibility

## Success Metrics

### Validation Coverage
- 100% of known field types validated
- All field variants detected correctly
- Compound fields handled properly

### Error Prevention
- 95% reduction in field-related errors
- Clear error messages for all validation failures
- Preventive validation before API calls

### Developer Satisfaction
- Improved debugging with detailed errors
- Type-safe field handling
- Comprehensive documentation

## Conclusion

By integrating the gravity-forms-field-definitions into the MCP server, we achieve:

1. **100% Valid Structure**: Every form, entry, and submission validated against official field definitions
2. **Type Safety**: Field-specific validation rules enforced
3. **Variant Awareness**: Correct handling of field configurations
4. **Storage Accuracy**: Proper data serialization and storage
5. **Developer Confidence**: Clear errors and comprehensive validation

This integration transforms the MCP server from a generic API wrapper into an intelligent, field-aware system that ensures data integrity and provides superior developer experience.