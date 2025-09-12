# Testing Guide for Gravity Forms MCP Server

## Understanding the "No Output" Issue

If you're seeing MCP tools execute without visible output, this is typically due to one of these reasons:

### 1. Missing API Credentials
The most common cause is that the server doesn't have valid Gravity Forms API credentials configured.

**Solution**: Set up your `.env` file:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 2. Empty API Responses
The API might be working but returning empty data (no forms created yet).

**Test this**:
```bash
# Run the output test script
node scripts/test-server-output.js
```

### 3. MCP Inspector Display
The MCP inspector might not be showing the full response structure.

## Setting Up for Testing

### Option 1: Test with Mock Data (Recommended for Development)

1. **Run the test suite** to verify everything works:
```bash
npm test
```

2. **Test server output formatting**:
```bash
node scripts/test-server-output.js
```

3. **Run the MCP inspector with mock mode**:
```bash
# Set test environment variables
export GRAVITY_MCP_TEST_MODE=true
export GRAVITY_FORMS_CONSUMER_KEY=ck_test
export GRAVITY_FORMS_CONSUMER_SECRET=cs_test
export GRAVITY_FORMS_BASE_URL=https://test.example.com

# Run inspector
npm run inspect
```

### Option 2: Connect to Real Gravity Forms API

1. **Get API Credentials**:
   - Log into your WordPress admin
   - Go to Forms → Settings → REST API
   - Create new API keys (Consumer Key and Secret)

2. **Configure Environment**:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your credentials
GRAVITY_FORMS_CONSUMER_KEY=ck_your_actual_key
GRAVITY_FORMS_CONSUMER_SECRET=cs_your_actual_secret
GRAVITY_FORMS_BASE_URL=https://yoursite.com
```

3. **Test Connection**:
```bash
node scripts/check-env.js
```

4. **Run MCP Inspector**:
```bash
npm run inspect
```

## Verifying Tool Output

### Test Script Results
When you run `node scripts/test-server-output.js`, you should see:

```json
{
  "success": true,
  "forms": [
    {
      "id": 1,
      "title": "Contact Form",
      "description": "Simple contact form",
      "is_active": true,
      "date_created": "2024-01-01 12:00:00",
      "entries_count": 42
    }
  ],
  "total_count": 2,
  "total_pages": 1,
  "current_page": 1,
  "per_page": 10
}
```

### Expected MCP Tool Response
When calling `gf_list_forms` through MCP, you should receive:

```json
{
  "success": true,
  "forms": [...],
  "total_count": 0,
  "total_pages": 1,
  "current_page": 1,
  "per_page": 20
}
```

If `forms` is an empty array, it means:
- Connection is working
- No forms exist in the system
- You need to create a form first using `gf_create_form`

## Creating Test Data

### Create a Test Form
Use the `gf_create_form` tool:

```json
{
  "title": "Test Contact Form",
  "description": "A test form for verification",
  "fields": [
    {
      "id": 1,
      "label": "Name",
      "type": "text",
      "required": true
    },
    {
      "id": 2,
      "label": "Email",
      "type": "email",
      "required": true
    }
  ],
  "is_active": true
}
```

### Verify Form Creation
Call `gf_list_forms` again - you should now see your form in the results.

## Debugging Tips

### 1. Enable Debug Mode
```bash
export GRAVITY_FORMS_DEBUG=true
```

### 2. Check Server Logs
The server outputs to stderr, so you'll see logs in the console:
- ✅ Success messages
- ❌ Error messages
- 🔐 Authentication method (when debug is enabled)

### 3. Test Individual Components
```bash
# Test authentication
node src/tests/authentication.test.js

# Test forms endpoint
node src/tests/forms.test.js

# Test all components
npm run test:all
```

### 4. Verify API Availability
```bash
# This will check if the REST API is accessible
curl -H "Authorization: Basic $(echo -n 'ck_key:cs_secret' | base64)" \
     https://yoursite.com/wp-json/gf/v2/forms
```

## Common Issues and Solutions

### Issue: "Gravity Forms client not initialized"
**Cause**: Environment variables not set
**Solution**: Ensure `.env` file exists with valid credentials

### Issue: "401 Unauthorized"
**Cause**: Invalid API credentials
**Solution**: Regenerate API keys in WordPress admin

### Issue: "404 Not Found"
**Cause**: REST API not enabled or wrong URL
**Solution**: 
- Verify REST API is enabled in Gravity Forms settings
- Check URL format (should be `https://site.com` without `/wp-json`)

### Issue: Empty responses but no errors
**Cause**: No data exists in the system
**Solution**: Create test forms and entries first

### Issue: "HTTPS required for Basic Authentication"
**Cause**: Using HTTP with Basic Auth
**Solution**: 
- Use HTTPS URL, or
- Set `GRAVITY_FORMS_AUTH_METHOD=oauth` for HTTP

## Integration Testing

For full integration testing with a real Gravity Forms installation:

```bash
# Set up test environment
export GRAVITY_FORMS_TEST_BASE_URL=https://test.yoursite.com
export GRAVITY_FORMS_TEST_CONSUMER_KEY=ck_test_key
export GRAVITY_FORMS_TEST_CONSUMER_SECRET=cs_test_secret

# Run integration tests
npm run test
```

## Performance Testing

Test the server's performance with multiple concurrent requests:

```bash
# Create test data
node scripts/setup-test-data.js

# Run performance tests (coming soon)
# npm run test:performance
```

## Next Steps

1. ✅ Verify test suite passes: `npm test`
2. ✅ Check server output: `node scripts/test-server-output.js`
3. 📝 Configure real API credentials in `.env`
4. 🧪 Test with MCP inspector: `npm run inspect`
5. 🚀 Start using the MCP tools with real data

If you continue to experience issues, please check:
- Server logs for error messages
- Network connectivity to your WordPress site
- Gravity Forms REST API is enabled and accessible
- API credentials have sufficient permissions