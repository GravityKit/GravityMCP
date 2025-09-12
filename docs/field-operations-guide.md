# Field Operations Guide

## Overview

The Gravity Forms MCP server includes powerful field-level operations that allow intelligent management of form fields through 4 specialized tools. These operations work within REST API v2 constraints while providing advanced features like dependency tracking, intelligent positioning, and compound field support.

## Quick Start

### Prerequisites
- Gravity Forms with REST API v2 enabled
- Valid Consumer Key and Consumer Secret
- Forms with existing fields for testing

### Basic Usage

```javascript
// Add a new field
const result = await mcp_call('gf_add_field', {
  form_id: 123,
  field_type: 'text',
  properties: {
    label: 'Full Name',
    isRequired: true,
    placeholder: 'Enter your full name'
  },
  position: {
    mode: 'append'
  }
});
```

## Available Tools

### 1. `gf_add_field` - Add New Fields

Add fields to forms with intelligent defaults and positioning.

#### Parameters
- `form_id` (number): Target form ID
- `field_type` (string): Field type (text, email, address, etc.)
- `properties` (object): Field properties and configuration
- `position` (object): Where to place the field

#### Basic Examples

**Simple Text Field:**
```javascript
{
  form_id: 123,
  field_type: 'text',
  properties: {
    label: 'First Name',
    isRequired: true,
    size: 'medium'
  }
}
```

**Email Field with Confirmation:**
```javascript
{
  form_id: 123,
  field_type: 'email',
  properties: {
    label: 'Email Address',
    isRequired: true,
    emailConfirmEnabled: true,
    placeholder: 'your@email.com'
  }
}
```

**Dropdown with Choices:**
```javascript
{
  form_id: 123,
  field_type: 'select',
  properties: {
    label: 'Country',
    choices: [
      { text: 'United States', value: 'US' },
      { text: 'Canada', value: 'CA' },
      { text: 'United Kingdom', value: 'UK' }
    ],
    defaultValue: 'US'
  }
}
```

#### Compound Fields

**Address Field:**
```javascript
{
  form_id: 123,
  field_type: 'address',
  properties: {
    label: 'Billing Address',
    addressType: 'us', // or 'international'
    isRequired: true
  }
}
// Creates field with sub-inputs: street, city, state, zip, country
```

**Name Field:**
```javascript
{
  form_id: 123,
  field_type: 'name',
  properties: {
    label: 'Full Name',
    nameFormat: 'advanced', // includes prefix, suffix
    isRequired: true
  }
}
// Creates field with sub-inputs: prefix, first, middle, last, suffix
```

#### Advanced Positioning

**Append to End:**
```javascript
{
  position: { mode: 'append' }
}
```

**Insert After Specific Field:**
```javascript
{
  position: {
    mode: 'after',
    reference: 5  // Field ID
  }
}
```

**Page-Aware Positioning:**
```javascript
{
  position: {
    mode: 'append',
    page: 2  // Add to end of page 2
  }
}
```

#### Response Format
```javascript
{
  success: true,
  field: {
    id: 8,
    type: 'text',
    label: 'First Name',
    // ... complete field object
  },
  form_id: 123,
  position: {
    index: 7,
    page: 1
  },
  metadata: {
    total_fields: 8,
    compound_inputs: 0
  }
}
```

### 2. `gf_update_field` - Update Existing Fields

Update field properties with dependency checking.

#### Parameters
- `form_id` (number): Form containing the field
- `field_id` (number): Field to update
- `properties` (object): Properties to change
- `force` (boolean): Skip dependency warnings

#### Examples

**Update Label and Requirement:**
```javascript
{
  form_id: 123,
  field_id: 5,
  properties: {
    label: 'Updated Field Label',
    isRequired: false,
    description: 'Additional field help text'
  }
}
```

**Add Conditional Logic:**
```javascript
{
  form_id: 123,
  field_id: 7,
  properties: {
    conditionalLogic: {
      enabled: true,
      logicType: 'all',
      rules: [
        {
          fieldId: 3,
          operator: 'is',
          value: 'yes'
        }
      ]
    }
  }
}
```

**Enable Calculations:**
```javascript
{
  form_id: 123,
  field_id: 10,
  properties: {
    enableCalculation: true,
    calculationFormula: '{Quantity:8} * {Price:9}',
    calculationRounding: 2
  }
}
```

#### Response Format
```javascript
{
  success: true,
  field: {
    // Updated field object
  },
  changes: {
    before: {
      label: 'Old Label',
      isRequired: true
    },
    after: {
      label: 'New Label',
      isRequired: false
    }
  },
  warnings: {
    dependencies: [
      {
        type: 'conditional_logic',
        field_id: 12,
        description: 'Field 12 has conditional logic based on this field'
      }
    ]
  }
}
```

### 3. `gf_delete_field` - Remove Fields

Delete fields with dependency analysis and cascade options.

#### Parameters
- `form_id` (number): Form containing the field
- `field_id` (number): Field to delete
- `force` (boolean): Delete despite dependencies
- `cascade` (boolean): Clean up dependencies automatically

#### Basic Deletion
```javascript
{
  form_id: 123,
  field_id: 8,
  force: false  // Will warn if dependencies exist
}
```

#### Force Deletion with Cleanup
```javascript
{
  form_id: 123,
  field_id: 8,
  force: true,
  cascade: true  // Remove references in other fields
}
```

#### Response Format
```javascript
{
  success: true,
  deleted_field: {
    id: 8,
    type: 'text',
    label: 'Removed Field'
  },
  dependencies: {
    conditional_logic: [
      { field_id: 12, rule_count: 1 }
    ],
    calculations: [
      { field_id: 15, formula: '{Removed Field:8} * 2' }
    ],
    merge_tags: [
      { location: 'notification', field: 'message' }
    ]
  },
  actions_taken: [
    'Removed conditional logic in field 12',
    'Updated calculation in field 15',
    'Cleaned merge tags in notifications'
  ]
}
```

### 4. `gf_list_field_types` - Available Field Types

List available field types with filtering and metadata.

#### Parameters
- `category` (string): Filter by category (standard, advanced, pricing, post)
- `feature` (string): Filter by feature support (required, conditional, duplicate)
- `search` (string): Search field types by name or description
- `include_variants` (boolean): Include field variants in results

#### Basic Listing
```javascript
{
  category: 'standard'
}
```

#### Advanced Filtering
```javascript
{
  category: 'advanced',
  feature: 'conditional',
  search: 'address',
  include_variants: true
}
```

#### Response Format
```javascript
{
  success: true,
  total: 12,
  categories: ['standard', 'advanced'],
  field_types: [
    {
      type: 'text',
      label: 'Single Line Text',
      category: 'standard',
      description: 'Single line text input field',
      features: {
        required: true,
        conditional: true,
        duplicate: true,
        prepopulate: true
      },
      defaults: {
        size: 'medium',
        maxLength: 0
      },
      variants: []
    },
    {
      type: 'address',
      label: 'Address',
      category: 'advanced',
      description: 'Complete address with multiple inputs',
      features: {
        required: true,
        conditional: true,
        duplicate: false,
        prepopulate: true
      },
      storage: {
        type: 'compound',
        inputs: 6
      },
      variants: [
        {
          name: 'US Format',
          config: { addressType: 'us' }
        },
        {
          name: 'International Format', 
          config: { addressType: 'international' }
        }
      ]
    }
  ]
}
```

## Field Types Reference

### Standard Fields
- **text**: Single line text input
- **textarea**: Multi-line text area
- **select**: Dropdown select
- **multiselect**: Multiple choice dropdown
- **number**: Numeric input with validation
- **checkbox**: Multiple checkboxes
- **radio**: Single choice radio buttons
- **hidden**: Hidden field for data storage

### Advanced Fields
- **name**: Full name with multiple parts
- **date**: Date picker with format options
- **time**: Time picker
- **phone**: Phone number with format validation
- **email**: Email address with optional confirmation
- **website**: URL validation
- **password**: Password input with confirmation
- **address**: Complete address information
- **fileupload**: File upload (single/multiple)

### Pricing Fields
- **product**: Product selection with price
- **quantity**: Quantity selector
- **option**: Product options/variants
- **total**: Calculated total display
- **shipping**: Shipping options
- **creditcard**: Credit card information

### Post Fields
- **post_title**: Post title creation
- **post_content**: Post content editor
- **post_excerpt**: Post excerpt
- **post_category**: Category selection
- **post_tags**: Tag assignment
- **post_custom_field**: Custom field values
- **post_image**: Featured image upload

### Layout Fields
- **section**: Visual section break
- **page**: Page break for multi-page forms
- **html**: Custom HTML content

## Advanced Features

### Dependency Tracking

The system automatically tracks field dependencies:

**Conditional Logic Dependencies:**
```javascript
// Field A shows only if Field B = "yes"
{
  conditionalLogic: {
    rules: [{ fieldId: 'B', operator: 'is', value: 'yes' }]
  }
}
```

**Calculation Dependencies:**
```javascript
// Field C calculates from Fields A and B  
{
  calculationFormula: '{Field A:1} + {Field B:2}'
}
```

**Merge Tag Dependencies:**
```javascript
// Notification uses field value
{
  message: 'Thank you {Name:1} for your submission'
}
```

### Page-Aware Positioning

For multi-page forms, the system handles page boundaries intelligently:

```javascript
// Get fields for specific page
const page2Fields = engine.getFieldsForPage(fields, 2);

// Add field to specific page
{
  position: {
    mode: 'append',
    page: 2  // Adds to end of page 2
  }
}

// Insert before page break
{
  position: {
    mode: 'prepend', 
    page: 3  // Adds at start of page 3
  }
}
```

### Compound Field Management

Complex fields automatically generate sub-inputs:

**Address Field Structure:**
```javascript
{
  id: 5,
  type: 'address',
  inputs: [
    { id: '5.1', label: 'Street Address' },
    { id: '5.2', label: 'Address Line 2' },
    { id: '5.3', label: 'City' },
    { id: '5.4', label: 'State' },
    { id: '5.5', label: 'ZIP Code' },
    { id: '5.6', label: 'Country' }
  ]
}
```

**Name Field Structure:**
```javascript
{
  id: 7,
  type: 'name', 
  nameFormat: 'advanced',
  inputs: [
    { id: '7.2', label: 'Prefix' },
    { id: '7.3', label: 'First' },
    { id: '7.4', label: 'Middle' },
    { id: '7.6', label: 'Last' },
    { id: '7.8', label: 'Suffix' }
  ]
}
```

## Configuration

### Test vs Live Environment

The system supports dual configuration for safe development:

```javascript
// Test environment (safe for development)
const testConfig = {
  environment: 'test',
  formPrefix: 'TEST_',
  autoCleanup: true,
  maxTestForms: 10
};

// Live environment (production)
const liveConfig = {
  environment: 'live', 
  formPrefix: '',
  autoCleanup: false,
  maxTestForms: 0
};
```

### Field Validation

Built-in validation ensures field integrity:

```javascript
const validator = new FieldAwareValidator();

// Validate field properties
const warnings = validator.getWarnings(field, form);

// Example warnings:
[
  {
    type: 'performance',
    message: 'Large choice lists (>50 items) may impact form performance'
  },
  {
    type: 'usability', 
    message: 'Required fields should have clear labels'
  }
]
```

## Error Handling

### Common Errors

**Field Not Found:**
```javascript
{
  success: false,
  error: 'Field 99 not found in form 123',
  suggestion: 'Check field ID and form ID are correct'
}
```

**Invalid Field Type:**
```javascript
{
  success: false,
  error: 'Unknown field type: custom_type',
  suggestion: 'Use gf_list_field_types to see available types'
}
```

**Dependency Conflicts:**
```javascript
{
  success: false,
  error: 'Cannot delete field with active dependencies',
  dependencies: {
    conditional_logic: [{ field_id: 12 }]
  },
  suggestion: 'Use force=true to override or cascade=true to clean up'
}
```

### Best Practices

1. **Always Check Dependencies**: Use dependency scanning before modifications
2. **Test Environment First**: Use test configuration for development
3. **Backup Forms**: Export forms before major changes
4. **Incremental Changes**: Make small changes and verify results
5. **Use Compound Fields**: Leverage built-in compound field types
6. **Validate Input**: Check field properties before submission
7. **Handle Errors**: Implement proper error handling in your code

## Testing

### Unit Tests
```bash
# Run all field operation unit tests
node src/tests/field-manager.test.js
node src/tests/field-dependencies.test.js
node src/tests/field-positioner.test.js
```

### Integration Tests
```bash
# Set up test credentials
export TEST_GF_CONSUMER_KEY="ck_..."
export TEST_GF_CONSUMER_SECRET="cs_..."
export TEST_GF_URL="https://test.example.com"

# Run integration tests
node src/tests/field-operations-integration.test.js
```

### E2E Scenarios
```bash
# Run complete workflow tests
node src/tests/field-operations-e2e.test.js
```

## Performance Considerations

### Optimization Tips

1. **Batch Operations**: Group multiple field changes together
2. **Minimal Updates**: Only update changed properties
3. **Cache Field Types**: Cache field type lists for repeated use
4. **Position Efficiently**: Use specific positioning over repositioning
5. **Cleanup Regularly**: Remove unused test forms and fields

### Memory Usage

The system is designed for efficiency:
- Field operations: ~2MB memory usage
- Dependency scanning: ~500KB per form
- Position calculations: ~100KB per operation
- Total overhead: <5MB for typical usage

## Troubleshooting

### Common Issues

**"Field operations not initialized"**
- Ensure field operations are properly initialized before use
- Check that all required dependencies are available

**"Position calculation failed"**
- Verify target form exists and has fields
- Check page numbers are valid for multi-page forms

**"Dependency scan timeout"**
- Large forms may take time to scan
- Consider using specific field scans vs full form scans

**"Compound field creation failed"**
- Verify field type supports compound inputs
- Check that sub-input configuration is valid

### Debug Mode

Enable detailed logging for troubleshooting:

```javascript
const config = {
  debug: true,
  logLevel: 'verbose'
};
```

This will output detailed information about:
- Field operations steps
- Dependency scanning results
- Position calculations
- API request/response details

## Examples Repository

For more examples and use cases, see the `examples/` directory:

- `basic-field-operations.js` - Simple CRUD operations
- `advanced-positioning.js` - Complex positioning scenarios  
- `dependency-management.js` - Working with field dependencies
- `compound-fields.js` - Creating and managing compound fields
- `form-builder.js` - Complete form building workflow

## Support

For issues or questions:

1. Check this documentation first
2. Review error messages for suggestions
3. Test with minimal examples
4. Check the GitHub issues for known problems
5. Create detailed bug reports with examples

The field operations system is designed to be robust and user-friendly while providing powerful capabilities for form management within Gravity Forms' REST API constraints.