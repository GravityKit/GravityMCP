/**
 * Field Operations Module - Main exports
 * Provides intelligent field management for Gravity MCP
 */

// Import core components for internal use
import { FieldManager } from './field-manager.js';
import { DependencyTracker } from './field-dependencies.js';
import { PositionEngine } from './field-positioner.js';
import { testConfig, TestFormManager } from '../config/test-config.js';

// Re-export components
export { FieldManager, DependencyTracker, PositionEngine, testConfig, TestFormManager };

/**
 * Create and configure field operations infrastructure
 * @param {object} apiClient - Gravity Forms API client
 * @param {object} fieldRegistry - Field type registry
 * @param {object} validator - Field validator
 * @returns {object} Configured field operations components
 */
export function createFieldOperations(apiClient, fieldRegistry, validator) {
  // Create core components
  const dependencyTracker = new DependencyTracker();
  const positionEngine = new PositionEngine();
  const fieldManager = new FieldManager(apiClient, fieldRegistry, validator);

  // Inject dependencies
  fieldManager.dependencyTracker = dependencyTracker;
  fieldManager.positionEngine = positionEngine;

  // Create test form manager if in test mode
  const testFormManager = testConfig.isTestMode() ?
    new TestFormManager(apiClient, testConfig) : null;

  return {
    fieldManager,
    dependencyTracker,
    positionEngine,
    testFormManager,
    config: testConfig
  };
}

/**
 * Field operation tool handlers for MCP integration
 */
export const fieldOperationHandlers = {
  /**
   * Add field to form
   */
  async gf_add_field(params, { fieldManager }) {
    const { form_id, field_type, properties = {}, position = {}, test_mode = false } = params;

    try {
      const result = await fieldManager.addField(
        form_id,
        field_type,
        properties,
        position
      );

      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        form_id,
        field_type
      };
    }
  },

  /**
   * Update field properties
   */
  async gf_update_field(params, { fieldManager }) {
    const { form_id, field_id, properties, force = false, test_mode = false } = params;

    try {
      const result = await fieldManager.updateField(
        form_id,
        field_id,
        properties
      );

      // Check for breaking changes if not forced
      if (!force && result.warnings?.dependencies?.length > 0) {
        return {
          success: false,
          error: 'Field has dependencies that may be affected',
          ...result,
          suggestion: 'Use force=true to update anyway'
        };
      }

      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        form_id,
        field_id
      };
    }
  },

  /**
   * Delete field with dependency checking
   */
  async gf_delete_field(params, { fieldManager }) {
    const { form_id, field_id, cascade = false, force = false, test_mode = false } = params;

    try {
      const result = await fieldManager.deleteField(
        form_id,
        field_id,
        { cascade, force }
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        form_id,
        field_id
      };
    }
  },

  /**
   * List available field types
   */
  async gf_list_field_types(params, { fieldRegistry }) {
    const { category, feature, search, include_variants = false } = params;

    try {
      const allTypes = Object.entries(fieldRegistry).map(([type, def]) => ({
        type,
        label: def.label,
        category: def.category,
        description: def.description,
        icon: def.icon,
        supports: {
          required: def.supportsRequired || false,
          conditional: def.supportsConditional || false,
          duplicate: def.supportsDuplicate || false,
          prepopulate: def.supportsPrepopulate || false,
          visibility: def.supportsVisibility || false,
          description: def.supportsDescription || false,
          validation: def.supportsValidation || false,
          css_class: def.supportsCssClass || false
        },
        variants: include_variants && def.variants ?
          Object.entries(def.variants).map(([name, variant]) => ({
            name,
            label: variant.label,
            description: variant.description,
            settings: variant.settings
          })) : undefined,
        storage: def.storage,
        validation: def.validation
      }));

      // Apply filters
      let filteredTypes = allTypes;

      if (category) {
        filteredTypes = filteredTypes.filter(t => t.category === category);
      }

      if (feature) {
        filteredTypes = filteredTypes.filter(t => t.supports[feature] === true);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredTypes = filteredTypes.filter(t =>
          t.type.toLowerCase().includes(searchLower) ||
          t.label.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
        );
      }

      // Get unique categories
      const categories = [...new Set(allTypes.map(t => t.category))].filter(Boolean);

      return {
        success: true,
        field_types: filteredTypes,
        total: filteredTypes.length,
        categories
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        field_types: [],
        total: 0,
        categories: []
      };
    }
  }
};

/**
 * MCP Tool Definitions for field operations
 */
export const fieldOperationTools = [
  {
    name: 'gf_add_field',
    description: 'Add a new field to a Gravity Form with intelligent defaults and positioning',
    inputSchema: {
      type: 'object',
      properties: {
        form_id: {
          type: 'number',
          description: 'The ID of the form to add the field to'
        },
        field_type: {
          type: 'string',
          description: 'The type of field to add (e.g., text, email, address)'
        },
        properties: {
          type: 'object',
          description: 'Field properties and settings',
          properties: {
            label: { type: 'string', description: 'Field label' },
            description: { type: 'string', description: 'Field description' },
            isRequired: { type: 'boolean', description: 'Whether field is required' },
            placeholder: { type: 'string', description: 'Placeholder text' },
            defaultValue: { type: 'string', description: 'Default value' },
            cssClass: { type: 'string', description: 'CSS class names' },
            size: {
              type: 'string',
              enum: ['small', 'medium', 'large'],
              description: 'Field size'
            },
            visibility: {
              type: 'string',
              enum: ['visible', 'hidden', 'administrative'],
              description: 'Field visibility'
            }
          }
        },
        position: {
          type: 'object',
          description: 'Field positioning configuration',
          properties: {
            mode: {
              type: 'string',
              enum: ['append', 'prepend', 'after', 'before', 'index'],
              description: 'Positioning mode'
            },
            reference: {
              type: 'number',
              description: 'Reference field ID (for after/before) or index'
            },
            page: {
              type: 'number',
              description: 'Page number for multi-page forms'
            }
          }
        },
        test_mode: {
          type: 'boolean',
          description: 'Use test configuration',
          default: false
        }
      },
      required: ['form_id', 'field_type']
    }
  },
  {
    name: 'gf_update_field',
    description: 'Update an existing field in a Gravity Form',
    inputSchema: {
      type: 'object',
      properties: {
        form_id: {
          type: 'number',
          description: 'The ID of the form containing the field'
        },
        field_id: {
          type: 'number',
          description: 'The ID of the field to update'
        },
        properties: {
          type: 'object',
          description: 'Field properties to update'
        },
        force: {
          type: 'boolean',
          description: 'Force update even if there are dependencies',
          default: false
        },
        test_mode: {
          type: 'boolean',
          description: 'Use test configuration',
          default: false
        }
      },
      required: ['form_id', 'field_id', 'properties']
    }
  },
  {
    name: 'gf_delete_field',
    description: 'Delete a field from a Gravity Form with dependency checking',
    inputSchema: {
      type: 'object',
      properties: {
        form_id: {
          type: 'number',
          description: 'The ID of the form containing the field'
        },
        field_id: {
          type: 'number',
          description: 'The ID of the field to delete'
        },
        cascade: {
          type: 'boolean',
          description: 'Automatically clean up dependencies',
          default: false
        },
        force: {
          type: 'boolean',
          description: 'Force deletion despite dependencies',
          default: false
        },
        test_mode: {
          type: 'boolean',
          description: 'Use test configuration',
          default: false
        }
      },
      required: ['form_id', 'field_id']
    }
  },
  {
    name: 'gf_list_field_types',
    description: 'List all available Gravity Forms field types with their capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (standard, advanced, pricing, post)'
        },
        feature: {
          type: 'string',
          description: 'Filter by feature support (required, conditional, duplicate)'
        },
        search: {
          type: 'string',
          description: 'Search in field type names and labels'
        },
        include_variants: {
          type: 'boolean',
          description: 'Include field variants in response',
          default: false
        }
      }
    }
  }
];