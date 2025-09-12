#!/usr/bin/env node

/**
 * Gravity MCP Server
 * Model Context Protocol server for Gravity Forms
 * Tools for forms, entries, and add-ons
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import GravityFormsClient from './gravity-forms-client.js';
import { createFieldOperations, fieldOperationHandlers, fieldOperationTools } from './field-operations/index.js';
import fieldRegistry from './field-definitions/field-registry.js';
import FieldAwareValidator from './config/field-validation.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

// Initialize the MCP server
const server = new Server(
  {
    name: 'gravitymcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Global client instance
let gravityFormsClient = null;
let fieldOperations = null;
let fieldValidator = null;

/**
 * Initialize Gravity Forms client
 */
async function initializeClient() {
  try {
    gravityFormsClient = new GravityFormsClient(process.env);
    const validation = await gravityFormsClient.initialize();

    if (!validation.available) {
      throw new Error(`Failed to initialize Gravity Forms client: ${validation.error}`);
    }

    // Initialize field operations infrastructure
    fieldValidator = new FieldAwareValidator();
    fieldOperations = createFieldOperations(
      gravityFormsClient,
      fieldRegistry,
      fieldValidator
    );

    logger.info('✅ Gravity MCP initialized successfully');
    logger.info('✅ Field operations infrastructure initialized');
    return true;
  } catch (error) {
    logger.error(`❌ Failed to initialize: ${error.message}`);
    throw error;
  }
}

/**
 * Create standard error response
 */
function createErrorResponse(message, details = null) {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}${details ? `\nDetails: ${JSON.stringify(details)}` : ''}`
      }
    ],
    isError: true
  };
}

/**
 * Wrap async handler with error handling
 */
function wrapHandler(handler) {
  return async (params) => {
    if (!gravityFormsClient) {
      return createErrorResponse('Gravity Forms client not initialized');
    }

    try {
      const result = await handler(params);

      // MCP expects content to be an array of content blocks
      // Each block should have a type (usually "text") and the actual content
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`Tool error: ${error.message}`);
      return createErrorResponse(error.message, error.details);
    }
  };
}

// =================================
// FORMS MANAGEMENT TOOLS (6)
// =================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Forms Management (6 tools)
      {
        name: 'gf_list_forms',
        description: 'List all forms (returns all forms as object keyed by ID)',
        inputSchema: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of form IDs to include (returns full form details)'
            }
          }
        }
      },
      {
        name: 'gf_get_form',
        description: 'Get a specific form by ID with complete schema',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Form ID' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_create_form',
        description: 'Create a new form with fields and settings',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Form title' },
            description: { type: 'string', description: 'Form description' },
            fields: {
              type: 'array',
              description: 'Array of field objects',
              items: { type: 'object' }
            },
            button: { type: 'object', description: 'Submit button settings' },
            confirmations: { type: 'object', description: 'Confirmation settings' },
            notifications: { type: 'object', description: 'Notification settings' },
            is_active: { type: 'boolean', description: 'Whether form is active' }
          },
          required: ['title']
        }
      },
      {
        name: 'gf_update_form',
        description: 'Update an existing form',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Form ID' },
            title: { type: 'string', description: 'Form title' },
            description: { type: 'string', description: 'Form description' },
            fields: {
              type: 'array',
              description: 'Array of field objects',
              items: { type: 'object' }
            },
            button: { type: 'object', description: 'Submit button settings' },
            confirmations: { type: 'object', description: 'Confirmation settings' },
            notifications: { type: 'object', description: 'Notification settings' },
            is_active: { type: 'boolean', description: 'Whether form is active' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_delete_form',
        description: 'Delete or trash a form (requires ALLOW_DELETE=true)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Form ID' },
            force: { type: 'boolean', description: 'Permanently delete if true, trash if false' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_validate_form',
        description: 'Validate form submission data',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' }
          },
          additionalProperties: true,
          required: ['form_id']
        }
      },

      // Entries Management (6 tools)
      {
        name: 'gf_list_entries',
        description: 'Search and list entries with advanced filtering',
        inputSchema: {
          type: 'object',
          properties: {
            form_ids: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of form IDs to filter entries'
            },
            include: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of entry IDs to include'
            },
            exclude: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of entry IDs to exclude'
            },
            status: {
              type: 'string',
              enum: ['active', 'spam', 'trash'],
              description: 'Filter by entry status'
            },
            search: {
              type: 'object',
              properties: {
                field_filters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      value: { type: 'string' },
                      operator: {
                        type: 'string',
                        enum: ['=', 'IS', 'CONTAINS', 'IS NOT', 'ISNOT', '<>', 'LIKE', 'NOT IN', 'NOTIN', 'IN', '>', '<', '>=', '<=']
                      }
                    }
                  }
                },
                mode: {
                  type: 'string',
                  enum: ['any', 'all'],
                  description: 'Search mode'
                }
              }
            },
            sorting: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                direction: {
                  type: 'string',
                  enum: ['asc', 'desc', 'ASC', 'DESC']
                }
              }
            },
            paging: {
              type: 'object',
              properties: {
                page_size: { type: 'number' },
                current_page: { type: 'number' }
              }
            }
          }
        }
      },
      {
        name: 'gf_get_entry',
        description: 'Get a specific entry by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Entry ID' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_create_entry',
        description: 'Create a new entry',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' },
            created_by: { type: 'number', description: 'User ID who created the entry' },
            status: {
              type: 'string',
              enum: ['active', 'spam', 'trash'],
              description: 'Entry status'
            },
            date_created: { type: 'string', description: 'Date created in ISO format' }
          },
          additionalProperties: true,
          required: ['form_id']
        }
      },
      {
        name: 'gf_update_entry',
        description: 'Update an existing entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Entry ID' },
            status: {
              type: 'string',
              enum: ['active', 'spam', 'trash'],
              description: 'Entry status'
            }
          },
          additionalProperties: true,
          required: ['id']
        }
      },
      {
        name: 'gf_delete_entry',
        description: 'Delete or trash an entry (requires ALLOW_DELETE=true)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Entry ID' },
            force: { type: 'boolean', description: 'Permanently delete if true, trash if false' }
          },
          required: ['id']
        }
      },

      // Form Submissions (2 tools)
      {
        name: 'gf_submit_form_data',
        description: 'Submit form data with full processing pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' },
            field_values: { type: 'object', description: 'Additional field values' }
          },
          additionalProperties: true,
          required: ['form_id']
        }
      },
      {
        name: 'gf_validate_submission',
        description: 'Validate form submission without processing',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' }
          },
          additionalProperties: true,
          required: ['form_id']
        }
      },

      // Notifications (1 tool)
      {
        name: 'gf_send_notifications',
        description: 'Send notifications for an entry',
        inputSchema: {
          type: 'object',
          properties: {
            entry_id: { type: 'number', description: 'Entry ID' },
            notification_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of notification IDs to send'
            }
          },
          required: ['entry_id']
        }
      },

      // Add-on Feeds (7 tools)
      {
        name: 'gf_list_feeds',
        description: 'List all add-on feeds',
        inputSchema: {
          type: 'object',
          properties: {
            addon: { type: 'string', description: 'Filter by addon slug' },
            form_id: { type: 'number', description: 'Filter by form ID' }
          }
        }
      },
      {
        name: 'gf_get_feed',
        description: 'Get a specific feed by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Feed ID' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_list_form_feeds',
        description: 'Get all feeds for a specific form',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' }
          },
          required: ['form_id']
        }
      },
      {
        name: 'gf_create_feed',
        description: 'Create a new add-on feed',
        inputSchema: {
          type: 'object',
          properties: {
            addon_slug: { type: 'string', description: 'Add-on slug' },
            form_id: { type: 'number', description: 'Form ID' },
            is_active: { type: 'boolean', description: 'Whether feed is active' },
            meta: { type: 'object', description: 'Feed configuration metadata' }
          },
          required: ['addon_slug', 'form_id', 'meta']
        }
      },
      {
        name: 'gf_update_feed',
        description: 'Update an existing feed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Feed ID' },
            is_active: { type: 'boolean', description: 'Whether feed is active' },
            meta: { type: 'object', description: 'Feed configuration metadata' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_patch_feed',
        description: 'Partially update a feed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Feed ID' },
            is_active: { type: 'boolean', description: 'Whether feed is active' },
            meta: { type: 'object', description: 'Feed configuration metadata' }
          },
          required: ['id']
        }
      },
      {
        name: 'gf_delete_feed',
        description: 'Delete an add-on feed',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Feed ID' }
          },
          required: ['id']
        }
      },

      // Field Filters (1 tool)
      {
        name: 'gf_get_field_filters',
        description: 'Get field filters for a form',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' }
          },
          required: ['form_id']
        }
      },

      // Results (1 tool)
      {
        name: 'gf_get_results',
        description: 'Get Quiz, Poll, or Survey results',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Form ID' }
          },
          required: ['form_id']
        }
      },

      // Field Operations (4 tools) - Intelligent field management
      ...fieldOperationTools
    ]
  };
});

// =================================
// TOOL HANDLERS
// =================================

// Forms Management Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: params } = request.params;

  // Ensure client is initialized
  if (!gravityFormsClient) {
    await initializeClient();
  }

  // Route to appropriate handler
  // The client already validates internally, just pass params directly
  switch (name) {
    // Forms Management
    case 'gf_list_forms':
      return wrapHandler(() => gravityFormsClient.listForms(params))();
    case 'gf_get_form':
      return wrapHandler(() => gravityFormsClient.getForm(params))();
    case 'gf_create_form':
      return wrapHandler(() => gravityFormsClient.createForm(params))();
    case 'gf_update_form':
      return wrapHandler(() => gravityFormsClient.updateForm(params))();
    case 'gf_delete_form':
      return wrapHandler(() => gravityFormsClient.deleteForm(params))();
    case 'gf_validate_form':
      return wrapHandler(() => gravityFormsClient.validateForm(params))();

    // Entries Management
    case 'gf_list_entries':
      return wrapHandler(() => gravityFormsClient.listEntries(params))();
    case 'gf_get_entry':
      return wrapHandler(() => gravityFormsClient.getEntry(params))();
    case 'gf_create_entry':
      return wrapHandler(() => gravityFormsClient.createEntry(params))();
    case 'gf_update_entry':
      return wrapHandler(() => gravityFormsClient.updateEntry(params))();
    case 'gf_delete_entry':
      return wrapHandler(() => gravityFormsClient.deleteEntry(params))();

    // Form Submissions
    case 'gf_submit_form_data':
      return wrapHandler(() => gravityFormsClient.submitFormData(params))();
    case 'gf_validate_submission':
      return wrapHandler(() => gravityFormsClient.validateSubmission(params))();

    // Notifications
    case 'gf_send_notifications':
      return wrapHandler(() => gravityFormsClient.sendNotifications(params))();

    // Add-on Feeds
    case 'gf_list_feeds':
      return wrapHandler(() => gravityFormsClient.listFeeds(params))();
    case 'gf_get_feed':
      return wrapHandler(() => gravityFormsClient.getFeed(params))();
    case 'gf_list_form_feeds':
      return wrapHandler(() => gravityFormsClient.listFormFeeds(params))();
    case 'gf_create_feed':
      return wrapHandler(() => gravityFormsClient.createFeed(params))();
    case 'gf_update_feed':
      return wrapHandler(() => gravityFormsClient.updateFeed(params))();
    case 'gf_patch_feed':
      return wrapHandler(() => gravityFormsClient.patchFeed(params))();
    case 'gf_delete_feed':
      return wrapHandler(() => gravityFormsClient.deleteFeed(params))();

    // Utilities
    case 'gf_get_field_filters':
      return wrapHandler(() => gravityFormsClient.getFieldFilters(params))();
    case 'gf_get_results':
      return wrapHandler(() => gravityFormsClient.getResults(params))();

    // Field Operations - Intelligent field management
    case 'gf_add_field':
      return wrapHandler(async () => {
        if (!fieldOperations) {
          throw new Error('Field operations not initialized');
        }
        return await fieldOperationHandlers.gf_add_field(params, fieldOperations);
      })();
    case 'gf_update_field':
      return wrapHandler(async () => {
        if (!fieldOperations) {
          throw new Error('Field operations not initialized');
        }
        return await fieldOperationHandlers.gf_update_field(params, fieldOperations);
      })();
    case 'gf_delete_field':
      return wrapHandler(async () => {
        if (!fieldOperations) {
          throw new Error('Field operations not initialized');
        }
        return await fieldOperationHandlers.gf_delete_field(params, fieldOperations);
      })();
    case 'gf_list_field_types':
      return wrapHandler(async () => {
        if (!fieldOperations) {
          throw new Error('Field operations not initialized');
        }
        return await fieldOperationHandlers.gf_list_field_types(params, fieldOperations);
      })();

    default:
      return createErrorResponse(`Unknown tool: ${name}`);
  }
});

// =================================
// SERVER INITIALIZATION
// =================================

async function main() {
  try {
    // Initialize client on startup
    await initializeClient();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.info('🚀 Gravity MCP running on stdio');
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('👋 Shutting down Gravity MCP...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('👋 Shutting down Gravity MCP...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});