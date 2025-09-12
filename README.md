# GravityMCP

A Model Context Protocol (MCP) server for Gravity Forms. Interact with your WordPress forms, entries, and submissions through any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/@gravitykit/gravitymcp.svg)](https://www.npmjs.com/package/@gravitykit/gravitymcp)

Built by [GravityKit](https://www.gravitykit.com) for the Gravity Forms and WordPress communities.

## Features

- **Comprehensive API Coverage**: Gravity Forms API endpoints
- **Smart Field Management**: Intelligent field operations with dependency tracking
- **Advanced Search**: Complex filtering and searching capabilities for entries
- **Form Submissions**: Full submission workflow with validation
- **Add-on Integration**: Manage feeds for MailChimp, Stripe, PayPal, and more
- **Type-Safe**: Comprehensive validation for all operations
- **Battle-Tested**: Extensive test suite with real-world scenarios

## Quick Start

### Prerequisites
- Node.js 18+
- WordPress with Gravity Forms 2.5+
- HTTPS-enabled WordPress site (required for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GravityKit/GravityMCP.git
   cd GravityMCP
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```

3. **Configure credentials** in `.env`:
   ```env
   GRAVITY_FORMS_CONSUMER_KEY=your_key_here
   GRAVITY_FORMS_CONSUMER_SECRET=your_secret_here
   GRAVITY_FORMS_BASE_URL=https://yoursite.com
   ```

4. **Generate API credentials** in WordPress:
   - Go to **Forms → Settings → REST API**
   - Click **Add Key**
   - Save the Consumer Key and Secret

5. **Add to Claude Desktop**

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "gravity": {
         "command": "node",
         "args": ["/path/to/gravity-mcp/src/index.js"],
         "env": {
           "GRAVITY_FORMS_CONSUMER_KEY": "your_key",
           "GRAVITY_FORMS_CONSUMER_SECRET": "your_secret",
           "GRAVITY_FORMS_BASE_URL": "https://yoursite.com"
         }
       }
     }
   }
   ```

## Available Tools

### Forms (6 tools)
- `gf_list_forms`    - List forms with filtering and pagination
- `gf_get_form`      - Get complete form configuration
- `gf_create_form`   - Create new forms with fields
- `gf_update_form`   - Update existing forms
- `gf_delete_form`   - Delete forms (requires ALLOW_DELETE=true)
- `gf_validate_form` - Validate form data

### Entries (5 tools)
- `gf_list_entries` - Search entries with advanced filters
- `gf_get_entry`    - Get specific entry details
- `gf_create_entry` - Create new entries
- `gf_update_entry` - Update existing entries
- `gf_delete_entry` - Delete entries (requires ALLOW_DELETE=true)

### Field Operations (4 tools)
- `gf_add_field`        - Add fields with intelligent positioning
- `gf_update_field`     - Update fields with dependency checking
- `gf_delete_field`     - Delete fields with cascade options
- `gf_list_field_types` - List available field types

### Submissions (2 tools)
- `gf_submit_form_data`    - Submit forms with full processing
- `gf_validate_submission` - Validate without submitting

### Add-ons (7 tools)
- `gf_list_feeds`       - List all add-on feeds
- `gf_get_feed`         - Get specific feed configuration
- `gf_list_form_feeds`  - List feeds for a specific form
- `gf_create_feed`      - Create new add-on feeds
- `gf_update_feed`      - Update existing feeds
- `gf_patch_feed`       - Partially update feed properties
- `gf_delete_feed`      - Delete add-on feeds

## Usage Examples

### Search Entries
```javascript
await mcp.call('gf_list_entries', {
  search: {
    field_filters: [
      { key: "1.3", value: "John", operator: "contains" },
      { key: "date_created", value: "2024-01-01", operator: ">=" }
    ],
    mode: "all"
  },
  sorting: { key: "date_created", direction: "desc" }
});
```

### Add Fields
```javascript
await mcp.call('gf_add_field', {
  form_id: 1,
  field_type: 'email',
  properties: {
    label: 'Email Address',
    isRequired: true
  }
});
```

### Submit Forms
```javascript
await mcp.call('gf_submit_form_data', {
  form_id: 1,
  input_1: "John Doe",
  input_2: "john@example.com",
  input_3: "Message content"
});
```

## Configuration

### Required Environment Variables
- `GRAVITY_FORMS_CONSUMER_KEY`    - API consumer key
- `GRAVITY_FORMS_CONSUMER_SECRET` - API consumer secret
- `GRAVITY_FORMS_BASE_URL`        - WordPress site URL

### Optional Settings
- `GRAVITY_FORMS_ALLOW_DELETE=false` - Enable delete operations
- `GRAVITY_FORMS_TIMEOUT=30000`      - Request timeout (ms)
- `GRAVITY_FORMS_DEBUG=false`        - Enable debug logging

## Test Environment Configuration

The server supports **dual environment configuration** to safely test without affecting production data.

### Setting Up Test Environment

Add test site credentials to your `.env` file alongside production credentials:

```env
# Production/Live Site
GRAVITY_FORMS_CONSUMER_KEY=ck_live_key
GRAVITY_FORMS_CONSUMER_SECRET=cs_live_secret
GRAVITY_FORMS_BASE_URL=https://www.yoursite.com

# Test/Staging Site (recommended for safe testing)
GRAVITY_FORMS_TEST_CONSUMER_KEY=ck_test_key
GRAVITY_FORMS_TEST_CONSUMER_SECRET=cs_test_secret
GRAVITY_FORMS_TEST_BASE_URL=https://staging.yoursite.com

# Enable test mode (optional)
GRAVITY_MCP_TEST_MODE=true
```

### Test Environment Features

When using test configuration:
- **Automatic test form prefixing** - All test forms created with "TEST_" prefix
- **Auto-cleanup** - Test forms automatically removed after testing
- **Environment isolation** - Complete separation from production data
- **Safe experimentation** - Test destructive operations without risk

### Using Test Mode

```bash
# Verify test environment configuration
GRAVITY_MCP_TEST_MODE=true npm run check-env

# Create test data on test site (requires test credentials)
npm run setup-test-data

# Run all tests against test site (auto-detects test credentials)
npm test

# Interactive testing with MCP Inspector (test mode)
GRAVITYMCP_TEST_MODE=true npm run inspect

# Run specific test suites against test site
NODE_ENV=test npm run test:forms
NODE_ENV=test npm run test:entries
NODE_ENV=test npm run test:submissions
```

### Test Mode Detection

The server automatically uses test configuration when:
1. `GRAVITYMCP_TEST_MODE=true` is set
2. OR `NODE_ENV=test` is set
3. OR test credentials are configured and test commands are run

### Test Safety Features

The server includes multiple safety mechanisms to prevent accidental production data contamination:

1. **Test Credential Requirements** - The `setup-test-data` script will **fail by default** if test credentials aren't configured
2. **No Silent Fallbacks** - Scripts that create or modify data won't silently fall back to production
3. **Explicit Production Override** - Production usage requires scary `--force-production` flag with warnings
4. **Clear Error Messages** - Helpful guidance on configuring test credentials when missing
5. **Test Data Prefixing** - All test forms automatically prefixed with "TEST_" for easy identification

### Best Practices

1. **Always configure a test environment** - Use a staging/test WordPress site
2. **Never test on production first** - Validate on test site before production
3. **Keep test credentials separate** - Different API keys for test vs live
4. **Use prefixes for test data** - Makes cleanup easy and identification clear
5. **Enable debug mode for testing** - `GRAVITY_FORMS_DEBUG=true` for detailed logs
6. **Review safety warnings** - Take warnings seriously when they appear

## Testing

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:forms
npm run test:entries
npm run test:field-operations

# Run with live API (requires credentials)
npm test
```

## Security

- **HTTPS Required**: All API communication encrypted
- **Delete Protection**: Destructive operations disabled by default
- **Input Validation**: All inputs validated before API calls
- **Rate Limiting**: Automatic retry with exponential backoff

## Troubleshooting

### Connection Issues
- Verify credentials with `npm run check-env`
- Ensure WordPress site is HTTPS-enabled
- Check REST API is enabled in Gravity Forms settings

### Authentication Errors
- Confirm API keys are correct
- Verify user has appropriate Gravity Forms capabilities
- Check Forms → Settings → REST API for key status

### Debug Mode
Enable detailed logging:
```env
GRAVITY_FORMS_DEBUG=true
```

## Support

- [GitHub Issues](https://github.com/GravityKit/gravity-mcp/issues)
- [Gravity Forms Documentation](https://docs.gravityforms.com/rest-api-v2/)
- [MCP Documentation](https://modelcontextprotocol.io/)

## License

GPL-2.0 License - see [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions from the Gravity Forms community! Whether you're building add-ons, managing forms, or integrating with other services, your insights and code contributions can help everyone.

### How to Contribute

1. **Fork the repository** - Start by creating your own copy
2. **Create a feature branch** - Keep your changes organized
3. **Add tests** - Ensure reliability with test coverage
4. **Run the test suite** - Verify everything works with `npm run test:all`
5. **Submit a pull request** - Share your improvements with the community

### Contribution Ideas

**For Add-on Developers:**
- Add support for your add-on's feed types
- Enhance field type definitions for custom fields
- Share integration patterns that work well

**For Form Builders:**
- Improve field validation logic
- Add helper utilities for common tasks
- Enhance error messages and debugging

**For Everyone:**
- Report bugs or suggest features via [GitHub Issues](https://github.com/GravityKit/gravity-mcp/issues)
- Improve documentation and examples
- Share your use cases and workflows

Your contributions help make Gravity Forms automation better for everyone. Let's build something great together!
