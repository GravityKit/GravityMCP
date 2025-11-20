/**
 * Gravity Forms REST API v2 Client
 * Comprehensive client for all Gravity Forms endpoints
 * Uses Basic Authentication as primary method per Gravity Forms v2 recommendations
 */

import axios from 'axios';
import https from 'https';
import FormData from 'form-data';
import { AuthManager, validateRestApiAccess } from './config/auth.js';
import { ValidationFactory } from './config/validation.js';
import logger from './utils/logger.js';
import { sanitizeUrl, sanitizeHeaders } from './utils/sanitize.js';

export class GravityFormsClient {
  constructor(config) {
    this.config = config;
    this.authManager = new AuthManager(config);
    this.baseURL = `${config.GRAVITY_FORMS_BASE_URL}/wp-json/gf/v2`;

    // Initialize HTTP client with Basic Auth as primary method
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(config.GRAVITY_FORMS_TIMEOUT) || 30000,
      headers: {
        'User-Agent': 'Gravity MCP v1.0.0',
        'Accept': 'application/json'
      },
      // Allow self-signed certificates for local development
      // Set MCP_ALLOW_SELF_SIGNED_CERTS=true in .env for local dev environments
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.MCP_ALLOW_SELF_SIGNED_CERTS !== 'true'
      })
    });

    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (requestConfig) => {
        // Get auth headers using the preferred method (Basic Auth primary)
        const authHeaders = this.authManager.getAuthHeaders(
          requestConfig.method?.toUpperCase(),
          `${this.baseURL}${requestConfig.url}`,
          requestConfig.params
        );

        // Merge auth headers
        requestConfig.headers = {
          ...requestConfig.headers,
          ...authHeaders
        };

        // Log request if debug enabled (with sanitization)
        if (this.config.GRAVITY_FORMS_DEBUG === 'true') {
          const safeUrl = sanitizeUrl(`${this.baseURL}${requestConfig.url}`);
          const safeHeaders = sanitizeHeaders(requestConfig.headers);
          console.log(`🌐 ${requestConfig.method?.toUpperCase()} ${safeUrl}`);
          if (requestConfig.data) {
            console.log('  📦 Request data sent (sanitized)');
          }
        }

        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        if (this.config.GRAVITY_FORMS_DEBUG === 'true') {
          // Response URLs are relative paths without sensitive data
          logger.info(`✅ ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        if (this.config.GRAVITY_FORMS_DEBUG === 'true') {
          // Error URLs are relative paths without sensitive data
          console.error(`❌ ${error.response?.status || 'Network Error'} ${error.config?.url || ''}`);
        }

        // Enhanced error handling
        return this.handleApiError(error);
      }
    );

    // Safety check for delete operations
    this.allowDelete = this.config.GRAVITY_FORMS_ALLOW_DELETE === 'true';
  }

  /**
   * Initialize and validate connection
   */
  async initialize() {
    // During testing, don't output to stderr to avoid red terminal output
    const isTest = process.env.NODE_ENV === 'test' ||
                  process.env.GRAVITY_FORMS_TEST_MODE === 'true' ||
                  process.argv.some(arg => arg.includes('test'));

    // Only output initialization messages when not in test mode
    if (!isTest) {
      logger.info('🚀 Initializing Gravity MCP');
      logger.info(`📡 Connecting to: ${this.config.GRAVITY_FORMS_BASE_URL}`);
    }

    // Validate REST API access
    const validation = await validateRestApiAccess(this.httpClient, this.authManager);

    if (!validation.available) {
      throw new Error(`Gravity Forms REST API not accessible: ${validation.error}`);
    }

    if (!isTest) {
      const authInfo = this.authManager.getAuthInfo();
      logger.info(`🔐 Authentication: ${authInfo.method} ${authInfo.recommended ? '(Recommended)' : '(Secondary)'}`);
      logger.info(`🛡️ Security: ${authInfo.secure ? 'HTTPS ✅' : 'HTTP ⚠️'}`);
      logger.info(`🔧 API Access: ${validation.message}`);
      logger.info(`🗑️ Delete Operations: ${this.allowDelete ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);

      if (!validation.fullAccess) {
        console.warn(`⚠️ Limited API access: ${validation.coverage}`);
      }
    }

    return validation;
  }

  /**
   * Enhanced error handling
   */
  async handleApiError(error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || error.message;

    // Create standardized error
    const apiError = new Error(message);
    apiError.status = status;
    apiError.code = data?.code;
    apiError.details = data;
    apiError.originalError = error;

    // Add helpful context based on error type
    switch (status) {
      case 401:
        apiError.message = `Authentication failed: ${message}. Please check your Consumer Key and Secret.`;
        break;
      case 403:
        apiError.message = `Access forbidden: ${message}. Please check user permissions in Gravity Forms.`;
        break;
      case 404:
        apiError.message = `Resource not found: ${message}`;
        break;
      case 429:
        apiError.message = `Rate limit exceeded: ${message}. Please wait before retrying.`;
        break;
      case 500:
        apiError.message = `Server error: ${message}. Please check your Gravity Forms installation.`;
        break;
    }

    throw apiError;
  }

  /**
   * Validate tool input and execute API call
   */
  async validateAndCall(toolName, input, apiCall) {
    try {
      // Validate input parameters
      const validatedInput = ValidationFactory.validateToolInput(toolName, input);

      // Execute API call with validated input
      return await apiCall(validatedInput);
    } catch (error) {
      // If it's an HTTP error from the mock/real client, handle it properly
      if (error.response && error.response.status) {
        // Transform the error with proper message based on status code
        return this.handleApiError(error);
      }
      // Otherwise, wrap validation errors with tool name
      throw new Error(`${toolName} failed: ${error.message}`);
    }
  }

  // =================================
  // FORMS MANAGEMENT (6 tools)
  // =================================

  /**
   * List all forms with filtering and pagination
   */
  async listForms(params = {}) {
    return this.validateAndCall('gf_list_forms', params, async (validated) => {
      const response = await this.httpClient.get('/forms', { params: validated });

      return {
        forms: response.data,
        total_count: parseInt(response.headers['x-wp-total'] || '0'),
        total_pages: parseInt(response.headers['x-wp-totalpages'] || '1'),
        current_page: validated.page || 1,
        per_page: validated.per_page || 20
      };
    });
  }

  /**
   * Get specific form by ID with complete schema
   */
  async getForm(params) {
    return this.validateAndCall('gf_get_form', params, async (validated) => {
      const { id } = validated;
      const response = await this.httpClient.get(`/forms/${id}`);

      return {
        form: response.data,
        field_count: response.data.fields?.length || 0,
        is_active: response.data.is_active || false,
        version: response.data.version || '1.0'
      };
    });
  }

  /**
   * Create new form with fields and settings
   */
  async createForm(params) {
    return this.validateAndCall('gf_create_form', params, async (validated) => {
      const response = await this.httpClient.post('/forms', validated);

      return {
        form: response.data,
        created: true,
        form_id: response.data.id,
        message: 'Form created successfully'
      };
    });
  }

  /**
   * Update existing form
   */
  async updateForm(params) {
    return this.validateAndCall('gf_update_form', params, async (validated) => {
      const { id, ...updates } = validated;

      // First, fetch the existing form to preserve all current data
      const existingFormResponse = await this.httpClient.get(`/forms/${id}`);
      const existingForm = existingFormResponse.data;

      // Merge the updates with the existing form data
      // This ensures we don't lose any fields that weren't included in the update
      const updatedFormData = {
        ...existingForm,
        ...updates
      };

      // Send the complete form data
      const response = await this.httpClient.put(`/forms/${id}`, updatedFormData);

      return {
        form: response.data,
        updated: true,
        form_id: id,
        message: 'Form updated successfully'
      };
    });
  }

  /**
   * Delete/trash form (requires ALLOW_DELETE=true)
   */
  async deleteForm(params) {
    if (!this.allowDelete) {
      throw new Error('Delete operations are disabled. Set GRAVITY_FORMS_ALLOW_DELETE=true to enable.');
    }

    return this.validateAndCall('gf_delete_form', params, async (validated) => {
      const { id, force = false } = validated;

      const deleteParams = {};
      if (force) {
        deleteParams.force = 'true';
      }

      const response = await this.httpClient.delete(`/forms/${id}`, { params: deleteParams });

      return {
        deleted: true,
        form_id: id,
        permanently: force,
        message: force ? 'Form permanently deleted' : 'Form moved to trash'
      };
    });
  }

  /**
   * Validate form submission data
   */
  async validateForm(params) {
    return this.validateAndCall('gf_validate_form', params, async (validated) => {
      const { form_id, ...submissionData } = validated;

      const response = await this.httpClient.post(`/forms/${form_id}/submissions`, {
        ...submissionData,
        validation_only: true
      });

      return {
        valid: response.data.is_valid || false,
        validation_messages: response.data.validation_messages || {},
        form_id: form_id,
        message: response.data.is_valid ? 'Form data is valid' : 'Validation errors found'
      };
    });
  }

  // =================================
  // ENTRIES MANAGEMENT (6 tools)
  // =================================

  /**
   * Search and list entries with advanced filtering
   */
  async listEntries(params = {}) {
    return this.validateAndCall('gf_list_entries', params, async (validated) => {
      // Convert search parameters to Gravity Forms format
      const searchParams = { ...validated };

      if (validated.search) {
        searchParams.search = JSON.stringify(validated.search);
      }

      if (validated.sorting) {
        searchParams.sorting = JSON.stringify(validated.sorting);
      }

      if (validated.paging) {
        searchParams.paging = JSON.stringify(validated.paging);
      }

      const response = await this.httpClient.get('/entries', { params: searchParams });

      return {
        entries: response.data.entries || response.data,
        total_count: response.data.total_count || parseInt(response.headers['x-wp-total'] || '0'),
        search_criteria: validated.search || null,
        sorting: validated.sorting || null
      };
    });
  }

  /**
   * Get specific entry by ID with field labels
   */
  async getEntry(params) {
    return this.validateAndCall('gf_get_entry', params, async (validated) => {
      const { id } = validated;
      const response = await this.httpClient.get(`/entries/${id}`);

      return {
        entry: response.data,
        form_id: response.data.form_id,
        status: response.data.status,
        date_created: response.data.date_created
      };
    });
  }

  /**
   * Create new entry with validation
   */
  async createEntry(params) {
    return this.validateAndCall('gf_create_entry', params, async (validated) => {
      const response = await this.httpClient.post('/entries', validated);

      return {
        entry: response.data,
        created: true,
        entry_id: response.data.id,
        form_id: response.data.form_id,
        message: 'Entry created successfully'
      };
    });
  }

  /**
   * Update existing entry
   */
  async updateEntry(params) {
    return this.validateAndCall('gf_update_entry', params, async (validated) => {
      const { id, ...updates } = validated;

      // First, fetch the existing entry to preserve all current field data
      const existingEntryResponse = await this.httpClient.get(`/entries/${id}`);
      const existingEntry = existingEntryResponse.data;

      // Merge the updates with the existing entry data
      // This ensures we don't lose any field values that weren't included in the update
      const updatedEntryData = {
        ...existingEntry,
        ...updates
      };

      // Send the complete entry data
      const response = await this.httpClient.put(`/entries/${id}`, updatedEntryData);

      return {
        entry: response.data,
        updated: true,
        entry_id: id,
        message: 'Entry updated successfully'
      };
    });
  }

  /**
   * Delete/trash entry (requires ALLOW_DELETE=true)
   */
  async deleteEntry(params) {
    if (!this.allowDelete) {
      throw new Error('Delete operations are disabled. Set GRAVITY_FORMS_ALLOW_DELETE=true to enable.');
    }

    return this.validateAndCall('gf_delete_entry', params, async (validated) => {
      const { id, force = false } = validated;

      const deleteParams = {};
      if (force) {
        deleteParams.force = 'true';
      }

      const response = await this.httpClient.delete(`/entries/${id}`, { params: deleteParams });

      return {
        deleted: true,
        entry_id: id,
        permanently: force,
        message: force ? 'Entry permanently deleted' : 'Entry moved to trash'
      };
    });
  }

  // =================================
  // FORM SUBMISSIONS (2 tools)
  // =================================

  /**
   * Submit form with complete processing pipeline
   */
  async submitFormData(params) {
    return this.validateAndCall('gf_submit_form_data', params, async (validated) => {
      const { form_id, ...submissionData } = validated;

      const response = await this.httpClient.post(`/forms/${form_id}/submissions`, submissionData);

      return {
        success: response.data.is_valid || false,
        entry_id: response.data.entry_id,
        confirmation_message: response.data.confirmation_message || '',
        validation_messages: response.data.validation_messages || {},
        form_id: form_id,
        message: response.data.is_valid ? 'Form submitted successfully' : 'Submission failed validation',
        // Include additional fields if present
        resume_token: response.data.resume_token,
        resume_url: response.data.resume_url,
        saved: response.data.saved
      };
    });
  }

  /**
   * Validate submission without processing
   */
  async validateSubmission(params) {
    return this.validateAndCall('gf_validate_submission', params, async (validated) => {
      const { form_id, ...submissionData } = validated;

      const response = await this.httpClient.post(`/forms/${form_id}/submissions`, {
        ...submissionData,
        validation_only: true
      });

      return {
        valid: response.data.is_valid || false,
        validation_messages: response.data.validation_messages || {},
        form_id: form_id,
        field_errors: response.data.field_errors || [],
        message: response.data.is_valid ? 'Submission data is valid' : 'Validation errors found'
      };
    });
  }

  // =================================
  // NOTIFICATIONS (1 tool)
  // =================================

  /**
   * Send notifications for entry
   */
  async sendNotifications(params) {
    return this.validateAndCall('gf_send_notifications', params, async (validated) => {
      const { entry_id, notification_ids } = validated;

      const requestData = {};
      if (notification_ids) {
        requestData.notification_ids = notification_ids;
      }

      const response = await this.httpClient.post(`/entries/${entry_id}/notifications`, requestData);

      return {
        sent: true,
        entry_id: entry_id,
        notifications_sent: response.data.notifications_sent || [],
        message: 'Notifications sent successfully'
      };
    });
  }

  // =================================
  // ADD-ON FEEDS (7 tools)
  // =================================

  /**
   * List all feeds or filter by addon
   */
  async listFeeds(params = {}) {
    return this.validateAndCall('gf_list_feeds', params, async (validated) => {
      const response = await this.httpClient.get('/feeds', { params: validated });

      return {
        feeds: response.data,
        total_count: response.data.length,
        filter: validated.addon || null
      };
    });
  }

  /**
   * Get specific feed by ID
   */
  async getFeed(params) {
    return this.validateAndCall('gf_get_feed', params, async (validated) => {
      const { id } = validated;
      const response = await this.httpClient.get(`/feeds/${id}`);

      return {
        feed: response.data,
        addon_slug: response.data.addon_slug,
        form_id: response.data.form_id,
        is_active: response.data.is_active
      };
    });
  }

  /**
   * Get all feeds for specific form
   */
  async listFormFeeds(params) {
    return this.validateAndCall('gf_list_form_feeds', params, async (validated) => {
      const { form_id } = validated;
      const response = await this.httpClient.get(`/forms/${form_id}/feeds`);

      return {
        feeds: response.data,
        form_id: form_id,
        total_count: response.data.length
      };
    });
  }

  /**
   * Create new add-on feed
   */
  async createFeed(params) {
    return this.validateAndCall('gf_create_feed', params, async (validated) => {
      const response = await this.httpClient.post('/feeds', validated);

      return {
        feed: response.data,
        created: true,
        feed_id: response.data.id,
        addon_slug: response.data.addon_slug,
        message: 'Feed created successfully'
      };
    });
  }

  /**
   * Update existing feed completely
   */
  async updateFeed(params) {
    return this.validateAndCall('gf_update_feed', params, async (validated) => {
      const { id, ...updates } = validated;

      // First, fetch the existing feed to preserve all current data
      const existingFeedResponse = await this.httpClient.get(`/feeds/${id}`);
      const existingFeed = existingFeedResponse.data;

      // Merge the updates with the existing feed data
      // This ensures we don't lose any configuration that wasn't included in the update
      const updatedFeedData = {
        ...existingFeed,
        ...updates
      };

      // Send the complete feed data
      const response = await this.httpClient.put(`/feeds/${id}`, updatedFeedData);

      return {
        feed: response.data,
        updated: true,
        feed_id: id,
        message: 'Feed updated successfully'
      };
    });
  }

  /**
   * Partially update feed properties
   */
  async patchFeed(params) {
    return this.validateAndCall('gf_patch_feed', params, async (validated) => {
      const { id, ...patchData } = validated;
      const response = await this.httpClient.patch(`/feeds/${id}`, patchData);

      return {
        feed: response.data,
        patched: true,
        feed_id: id,
        updated_fields: Object.keys(patchData),
        message: 'Feed partially updated successfully'
      };
    });
  }

  /**
   * Delete add-on feed
   */
  async deleteFeed(params) {
    if (!this.allowDelete) {
      throw new Error('Delete operations are disabled. Set GRAVITY_FORMS_ALLOW_DELETE=true to enable.');
    }

    return this.validateAndCall('gf_delete_feed', params, async (validated) => {
      const { id } = validated;
      const response = await this.httpClient.delete(`/feeds/${id}`);

      return {
        deleted: true,
        feed_id: id,
        message: 'Feed deleted successfully'
      };
    });
  }

  // =================================
  // UTILITIES (2 tools)
  // =================================

  /**
   * Get field filters for form (for search/filter UI)
   */
  async getFieldFilters(params) {
    return this.validateAndCall('gf_get_field_filters', params, async (validated) => {
      const { form_id } = validated;
      const response = await this.httpClient.get(`/forms/${form_id}/field-filters`);

      return {
        field_filters: response.data,
        form_id: form_id,
        filter_count: response.data.length
      };
    });
  }

  /**
   * Get Quiz, Poll, or Survey results with analytics
   */
  async getResults(params) {
    return this.validateAndCall('gf_get_results', params, async (validated) => {
      const { form_id, ...searchParams } = validated;
      const response = await this.httpClient.get(`/forms/${form_id}/results`, { params: searchParams });

      return {
        results: response.data,
        form_id: form_id,
        form_type: response.data.form_type || 'unknown',
        total_entries: response.data.total_entries || 0,
        summary: response.data.summary || {}
      };
    });
  }

  // =================================
  // UTILITY METHODS
  // =================================

  /**
   * Test connection and capabilities
   */
  async testConnection() {
    return await this.authManager.testConnection(this.httpClient);
  }

  /**
   * Get client information
   */
  getClientInfo() {
    const authInfo = this.authManager.getAuthInfo();
    return {
      baseUrl: this.config.GRAVITY_FORMS_BASE_URL,
      apiUrl: this.baseURL,
      authMethod: authInfo.method,
      deleteAllowed: this.allowDelete,
      timeout: this.httpClient.defaults.timeout,
      version: '1.0.0'
    };
  }
}

export default GravityFormsClient;