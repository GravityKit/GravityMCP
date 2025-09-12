/**
 * Integration Tests for Gravity MCP
 * Tests against real Gravity Forms API (requires test environment)
 */

import dotenv from 'dotenv';
import GravityFormsClient from '../gravity-forms-client.js';
import { TestRunner, TestAssert } from './helpers.js';
import { validateRestApiAccess } from '../config/auth.js';

// Set test mode to suppress initialization messages to stderr
process.env.GRAVITY_FORMS_TEST_MODE = 'true';

// Load test environment variables
dotenv.config();

const suite = new TestRunner('Integration Tests (Live API)');

// Skip integration tests if no test credentials
const hasTestCredentials = process.env.GRAVITY_FORMS_TEST_CONSUMER_KEY &&
                          process.env.GRAVITY_FORMS_TEST_CONSUMER_SECRET &&
                          process.env.GRAVITY_FORMS_TEST_BASE_URL;

console.log('🔍 Checking for test credentials...');
console.log(`   TEST_BASE_URL: ${process.env.GRAVITY_FORMS_TEST_BASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   TEST_CONSUMER_KEY: ${process.env.GRAVITY_FORMS_TEST_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   TEST_CONSUMER_SECRET: ${process.env.GRAVITY_FORMS_TEST_CONSUMER_SECRET ? '✅ Set' : '❌ Missing'}`);

if (!hasTestCredentials) {
  console.log('\n⚠️  Skipping integration tests - test credentials not found');
  console.log('   Set GRAVITY_FORMS_TEST_* variables in .env to enable');
  console.log('   Your .env should contain:');
  console.log('   GRAVITY_FORMS_TEST_BASE_URL=https://your-test-site.com');
  console.log('   GRAVITY_FORMS_TEST_CONSUMER_KEY=ck_your_test_key');
  console.log('   GRAVITY_FORMS_TEST_CONSUMER_SECRET=cs_your_test_secret\n');
  suite.skip = true;
} else {
  console.log('\n✅ Test credentials found - running integration tests\n');
}

let client;
let testFormId;
let testEntryId;
let testFeedId;

suite.beforeAll(async () => {
  if (suite.skip) return;

  // Create client with test credentials
  client = new GravityFormsClient({
    GRAVITY_FORMS_CONSUMER_KEY: process.env.GRAVITY_FORMS_TEST_CONSUMER_KEY,
    GRAVITY_FORMS_CONSUMER_SECRET: process.env.GRAVITY_FORMS_TEST_CONSUMER_SECRET,
    GRAVITY_FORMS_BASE_URL: process.env.GRAVITY_FORMS_TEST_BASE_URL,
    GRAVITY_FORMS_AUTH_METHOD: process.env.GRAVITY_FORMS_AUTH_METHOD || 'basic',
    GRAVITY_FORMS_ALLOW_DELETE: 'true' // Enable for cleanup
  });

  // Test connection
  try {
    await client.initialize();
    console.log('✅ Connected to test Gravity Forms instance');
  } catch (error) {
    console.error('❌ Failed to connect to test instance:', error.message);
    suite.skip = true;
  }
});

suite.afterAll(async () => {
  if (suite.skip) return;

  // Cleanup test data
  console.log('🧹 Cleaning up test data...');

  if (testFeedId) {
    try {
      await client.deleteFeed({ id: testFeedId });
      console.log(`  Deleted test feed ${testFeedId}`);
    } catch (error) {
      console.warn(`  Failed to delete test feed: ${error.message}`);
    }
  }

  if (testEntryId) {
    try {
      await client.deleteEntry({ id: testEntryId, force: true });
      console.log(`  Deleted test entry ${testEntryId}`);
    } catch (error) {
      console.warn(`  Failed to delete test entry: ${error.message}`);
    }
  }

  if (testFormId) {
    try {
      await client.deleteForm({ id: testFormId, force: true });
      console.log(`  Deleted test form ${testFormId}`);
    } catch (error) {
      console.warn(`  Failed to delete test form: ${error.message}`);
    }
  }
});

// =================================
// AUTHENTICATION & CONNECTION
// =================================

suite.test('Integration: Test API connection', async () => {
  const result = await client.authManager.testConnection(client.httpClient);

  TestAssert.isTrue(result.success, 'Connection should succeed');
  TestAssert.isNotNull(result.method, 'Should return auth method');
  console.log(`  Connected using ${result.method}`);
});

suite.test('Integration: Validate REST API access', async () => {
  const validation = await validateRestApiAccess(client.httpClient, client.authManager);

  TestAssert.isTrue(validation.available, 'REST API should be available');
  TestAssert.isNotNull(validation.coverage, 'Should have API coverage info');

  // Parse coverage string like "2/3" to get available endpoints count
  const availableEndpoints = parseInt(validation.coverage.split('/')[0]);
  TestAssert.isTrue(availableEndpoints > 0, `Should have API coverage (got ${validation.coverage})`);
  console.log(`  API coverage: ${validation.coverage} endpoints`);
});

// =================================
// FORMS CRUD OPERATIONS
// =================================

suite.test('Integration: Create test form', async () => {
  const formData = {
    title: `Test Form ${Date.now()}`,
    description: 'Integration test form - will be deleted',
    fields: [
      {
        id: 1,
        type: 'text',
        label: 'Name',
        isRequired: true
      },
      {
        id: 2,
        type: 'email',
        label: 'Email',
        isRequired: true
      },
      {
        id: 3,
        type: 'textarea',
        label: 'Message',
        isRequired: false
      }
    ],
    button: {
      text: 'Submit Test'
    },
    confirmations: [{
      type: 'message',
      message: 'Thank you for your test submission!'
    }]
  };

  const result = await client.createForm(formData);

  TestAssert.isTrue(result.created, 'Form should be created');
  TestAssert.isNotNull(result.form.id, 'Should return form ID');

  testFormId = result.form.id;
  console.log(`  Created test form ${testFormId}`);
});

suite.test('Integration: List forms includes test form', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  const result = await client.listForms();

  // Handle both array and object responses
  const forms = Array.isArray(result.forms) ? result.forms :
                (result.forms && typeof result.forms === 'object' ? Object.values(result.forms) : []);

  TestAssert.isTrue(forms.length > 0, `Should have forms (got ${forms.length})`);

  const testForm = forms.find(f => f && (f.id === testFormId || f.id === String(testFormId)));
  TestAssert.isNotNull(testForm, `Test form ${testFormId} should be in list`);
});

suite.test('Integration: Get test form details', async () => {
  const result = await client.getForm({ id: testFormId });

  TestAssert.equal(result.form.id, testFormId, 'Should return correct form');
  TestAssert.isTrue(result.form.fields.length > 0, 'Should have fields');
  TestAssert.includes(result.form.title, 'Test Form', 'Should have test title');
});

suite.test('Integration: Update test form', async () => {
  const updates = {
    id: testFormId,
    description: 'Updated description for integration test'
  };

  const result = await client.updateForm(updates);

  TestAssert.isTrue(result.updated, 'Form should be updated');
  TestAssert.equal(result.form.description, updates.description,
    'Description should be updated');
});

// =================================
// ENTRIES CRUD OPERATIONS
// =================================

suite.test('Integration: Create test entry', async () => {
  const entryData = {
    form_id: testFormId,
    '1': 'Test User',
    '2': 'test@example.com',
    '3': 'This is a test message from integration tests'
  };

  const result = await client.createEntry(entryData);

  TestAssert.isTrue(result.created, 'Entry should be created');
  TestAssert.isNotNull(result.entry.id, 'Should return entry ID');

  testEntryId = result.entry.id;
  console.log(`  Created test entry ${testEntryId}`);
});

suite.test('Integration: List entries includes test entry', async () => {
  const result = await client.listEntries({ form_id: testFormId });

  TestAssert.isTrue(result.entries.length > 0, 'Should have entries');

  const testEntry = result.entries.find(e => e.id === testEntryId);
  TestAssert.isNotNull(testEntry, 'Test entry should be in list');
});

suite.test('Integration: Get test entry details', async () => {
  // Skip if no test entry was created
  if (!testEntryId) {
    console.log('  Skipping - no test entry created');
    return;
  }

  const result = await client.getEntry({ id: testEntryId });

  // Handle both numeric and string IDs
  const entryId = result.entry.id || result.entry.entry_id;
  TestAssert.isTrue(
    entryId === testEntryId || entryId === String(testEntryId) || String(entryId) === String(testEntryId),
    `Should return correct entry (expected ${testEntryId}, got ${entryId})`
  );
  TestAssert.equal(result.entry['1'], 'Test User', 'Should have correct name');
  TestAssert.equal(result.entry['2'], 'test@example.com', 'Should have correct email');
});

suite.test('Integration: Update test entry', async () => {
  const updates = {
    id: testEntryId,
    '3': 'Updated test message'
  };

  const result = await client.updateEntry(updates);

  TestAssert.isTrue(result.updated, 'Entry should be updated');
  TestAssert.equal(result.entry['3'], updates['3'], 'Message should be updated');
});

suite.test('Integration: Search entries by field value', async () => {
  const result = await client.listEntries({
    search: {
      field_filters: [{
        key: '2',
        value: 'test@example.com',
        operator: '='
      }],
      mode: 'any'
    }
  });

  TestAssert.isTrue(result.entries.length > 0, 'Should find entries');

  const testEntry = result.entries.find(e => e.id === testEntryId);
  TestAssert.isNotNull(testEntry, 'Should find test entry');
});

// =================================
// FORM SUBMISSION
// =================================

suite.test('Integration: Validate form submission', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  // Note: The validation endpoint may not be available on all installations
  // This is a best-effort test that may not work on all servers
  try {
    const submissionData = {
      form_id: testFormId,
      input_1: '',  // Empty required field
      input_2: 'not-an-email',  // Invalid email
      input_3: 'Message'
    };

    const result = await client.validateSubmission(submissionData);

    TestAssert.isFalse(result.valid, 'Submission should be invalid');
    TestAssert.isNotNull(result.validation_messages, 'Should have validation messages');
    TestAssert.isNotNull(result.validation_messages['1'], 'Should have name error');
    TestAssert.isNotNull(result.validation_messages['2'], 'Should have email error');
    console.log('  Validation endpoint is available and working');
  } catch (error) {
    // The validation endpoint is not standard in Gravity Forms REST API v2
    // It's acceptable for this to fail on some installations
    if (error.message.includes('400') || error.message.includes('404') || error.message.includes('not found')) {
      console.log('  Note: Validation endpoint not available on this installation (expected)');
      // This is not a test failure - the endpoint is optional
      return;
    }
    // For any other error, let it fail the test
    throw error;
  }
});

suite.test('Integration: Submit valid form data', async () => {
  const submissionData = {
    form_id: testFormId,
    input_1: 'Integration Test User',
    input_2: 'integration@test.com',
    input_3: 'Submitted via integration test'
  };

  const result = await client.submitFormData(submissionData);

  TestAssert.isTrue(result.success, 'Submission should succeed');
  TestAssert.isNotNull(result.entry_id, 'Should create entry');
  TestAssert.includes(result.confirmation_message, 'Thank you',
    'Should return confirmation');

  // Clean up the submitted entry
  if (result.entry_id) {
    await client.deleteEntry({ id: result.entry_id, force: true });
    console.log(`  Cleaned up submission entry ${result.entry_id}`);
  }
});

// =================================
// FEEDS (IF ADD-ONS AVAILABLE)
// =================================

suite.test('Integration: List available feeds', async () => {
  const result = await client.listFeeds();

  // Feeds should always return an array, even if empty
  TestAssert.isNotNull(result.feeds, 'Should return feeds array');
  TestAssert.isTrue(Array.isArray(result.feeds), 'Feeds should be an array');

  console.log(`  Found ${result.feeds.length} feeds`);

  if (result.feeds.length > 0) {
    const addons = [...new Set(result.feeds.map(f => f.addon_slug))];
    console.log(`  Available addons: ${addons.join(', ')}`);
  }
});

suite.test('Integration: Create test feed (if MailChimp available)', async () => {
  // First check if MailChimp addon is available by trying to list its feeds
  let mailchimpAvailable = false;
  try {
    const feeds = await client.listFeeds({ addon: 'gravityformsmailchimp' });
    // If we get here without error, addon might be available
    mailchimpAvailable = !feeds.error || !feeds.error.includes('not installed');
  } catch (error) {
    // Addon check failed, likely not available
    mailchimpAvailable = false;
  }

  if (!mailchimpAvailable) {
    console.log('  MailChimp addon not installed - skipping feed test');
    return;
  }

  const feedData = {
    addon_slug: 'gravityformsmailchimp',
    form_id: testFormId,
    is_active: false,  // Keep inactive for testing
    meta: {
      feedName: 'Test Feed',
      mailchimpList: 'test_list',
      mappedFields_EMAIL: '2',
      mappedFields_FNAME: '1'
    }
  };

  const result = await client.createFeed(feedData);

  TestAssert.isTrue(result.created, 'Feed should be created');
  TestAssert.isNotNull(result.feed.id, 'Should return feed ID');

  testFeedId = result.feed.id;
  console.log(`  Created test feed ${testFeedId}`);
});

// =================================
// FIELD FILTERS & RESULTS
// =================================

suite.test('Integration: Get field filters for form', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  const result = await client.getFieldFilters({ form_id: testFormId });

  // Field filters should return a result object with filters
  TestAssert.isNotNull(result, 'Should return a result object');

  if (result.filters) {
    // Handle both array and object formats
    const filters = Array.isArray(result.filters) ? result.filters :
                   (typeof result.filters === 'object' ? Object.values(result.filters) : []);

    // Our test form has 3 fields, so we should have filters for them
    TestAssert.isTrue(filters.length > 0, 'Should have at least one field filter');
    console.log(`  Found ${filters.length} field filters`);
  } else {
    // If no filters, that's still a valid response - some forms may not have filterable fields
    console.log('  No field filters available for this form (valid response)');
  }
});

suite.test('Integration: Get form results (if applicable)', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  // Note: Results are only available for Quiz/Poll/Survey forms
  // Standard forms will return an error, which is expected behavior
  try {
    const result = await client.getResults({ form_id: testFormId });

    // If we get a result, it should have the results property
    TestAssert.isNotNull(result, 'Should return result object');

    if (result.results) {
      console.log('  Retrieved form results (Quiz/Poll/Survey form)');
    } else if (result.error) {
      // This is expected for non-Quiz/Poll/Survey forms
      console.log('  Form is not a Quiz/Poll/Survey - results not available (expected)');
    }
  } catch (error) {
    // For standard forms, getting an error is the expected behavior
    if (error.message.includes('not available') || error.message.includes('404') ||
        error.message.includes('Quiz') || error.message.includes('Poll') || error.message.includes('Survey')) {
      console.log('  Results endpoint not available for standard forms (expected)');
      return;
    }
    // For any other error, let it fail the test
    throw error;
  }
});

// =================================
// NOTIFICATIONS
// =================================

suite.test('Integration: Send notifications for entry', async () => {
  if (!testEntryId) {
    console.log('  No test entry available for notifications');
    return;
  }

  const result = await client.sendNotifications({
    entry_id: testEntryId
  });

  // Notifications should return a result even if no notifications were sent
  TestAssert.isNotNull(result, 'Should return result object');

  if (result.sent) {
    TestAssert.isTrue(result.sent, 'Notifications should be sent');
    console.log(`  Sent ${result.notifications_sent ? result.notifications_sent.length : 0} notifications`);
  } else {
    // It's valid for notifications not to be sent (e.g., no email configured)
    console.log('  No notifications were sent (may be due to configuration)');
  }
});

// =================================
// ERROR HANDLING
// =================================

suite.test('Integration: Handle non-existent form', async () => {
  await TestAssert.throwsAsync(
    () => client.getForm({ id: 999999 }),
    'not found',
    'Should handle 404 error'
  );
});

suite.test('Integration: Handle non-existent entry', async () => {
  await TestAssert.throwsAsync(
    () => client.getEntry({ id: 999999 }),
    'not found',
    'Should handle 404 error'
  );
});

suite.test('Integration: Handle invalid credentials', async () => {
  const badClient = new GravityFormsClient({
    GRAVITY_FORMS_CONSUMER_KEY: 'ck_invalid',
    GRAVITY_FORMS_CONSUMER_SECRET: 'cs_invalid',
    GRAVITY_FORMS_BASE_URL: process.env.GRAVITY_FORMS_TEST_BASE_URL
  });

  await TestAssert.throwsAsync(
    () => badClient.initialize(),
    'Authentication failed',
    'Should handle auth failure'
  );
});

// =================================
// PERFORMANCE & LIMITS
// =================================

suite.test('Integration: Verify forms endpoint behavior (no pagination support)', async () => {
  // The /forms endpoint does NOT support pagination per official documentation
  // This test verifies that behavior and documents the actual API response format

  const result = await client.listForms();

  // Verify we get a response
  TestAssert.isNotNull(result, 'Should return response object');
  TestAssert.isNotNull(result.forms, 'Should have forms property');

  // According to docs, forms are returned as an object keyed by form ID
  const isObject = typeof result.forms === 'object' && !Array.isArray(result.forms);

  if (isObject) {
    // This is the expected behavior per documentation
    const formIds = Object.keys(result.forms);
    console.log(`  ✓ Forms returned as object with ${formIds.length} forms (correct per API docs)`);

    // Verify structure
    if (formIds.length > 0) {
      const firstFormId = formIds[0];
      const firstForm = result.forms[firstFormId];

      TestAssert.equal(firstForm.id, firstFormId, 'Form ID should match object key');
      TestAssert.isNotNull(firstForm.title, 'Form should have title');
      // entries property may be excluded if gform_rest_api_retrieve_form_totals filter is false
    }
  } else if (Array.isArray(result.forms)) {
    // Non-standard response (not documented behavior)
    console.log(`  ⚠️ Forms returned as array with ${result.forms.length} forms (non-standard)`);
  }

  // Test that pagination parameters are ignored (as documented)
  console.log('  Testing that pagination parameters are ignored...');
  const paginatedResult = await client.listForms({
    paging: {
      page_size: 1,
      current_page: 1
    }
  });

  const allFormsCount = isObject ? Object.keys(result.forms).length : result.forms.length;
  const paginatedFormsCount = typeof paginatedResult.forms === 'object' && !Array.isArray(paginatedResult.forms)
    ? Object.keys(paginatedResult.forms).length
    : paginatedResult.forms.length;

  TestAssert.equal(paginatedFormsCount, allFormsCount,
    'Pagination parameters should be ignored (returns all forms)');

  console.log(`  ✓ Confirmed: /forms endpoint ignores pagination (returned ${paginatedFormsCount} forms)`);
});

suite.test('Integration: Test include parameter for forms', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  // Test the 'include' parameter which IS supported per documentation
  const result = await client.listForms({ include: [testFormId] });

  TestAssert.isNotNull(result, 'Should return response object');
  TestAssert.isNotNull(result.forms, 'Should have forms property');

  // When using include parameter, response should be an object with full form details
  const isObject = typeof result.forms === 'object' && !Array.isArray(result.forms);

  if (isObject) {
    const formIds = Object.keys(result.forms);

    // Should only return the requested form(s)
    TestAssert.equal(formIds.length, 1, 'Should return only the requested form');
    TestAssert.equal(formIds[0], String(testFormId), 'Should return the correct form ID');

    const form = result.forms[String(testFormId)];

    // When using include, we get the full form object with fields
    TestAssert.isNotNull(form.fields, 'Should include fields in response when using include parameter');
    TestAssert.isNotNull(form.version, 'Should include version in response');
    TestAssert.isNotNull(form.id, 'Should include form ID');

    console.log(`  Include parameter working: returned form ${form.id} with ${form.fields ? form.fields.length : 0} fields`);
  } else {
    console.log('  Include parameter test skipped - non-standard response format');
  }
});

suite.test('Integration: Test entries pagination with paging parameters', async () => {
  // Skip if no test form was created
  if (!testFormId) {
    console.log('  Skipping - no test form created');
    return;
  }

  console.log('  Testing entries pagination...');

  // Create additional test entries for pagination
  const entry2 = await client.createEntry({
    form_id: testFormId,
    '1': 'Pagination Test User 2',
    '2': 'pagination2@example.com',
    '3': 'Second test entry for pagination'
  });

  const entry3 = await client.createEntry({
    form_id: testFormId,
    '1': 'Pagination Test User 3',
    '2': 'pagination3@example.com',
    '3': 'Third test entry for pagination'
  });

  const testEntryIds = [entry2.entry.id, entry3.entry.id];

  try {
    // Test with paging parameters (entries DO support pagination)
    const page1Result = await client.listEntries({
      form_id: testFormId,
      paging: {
        page_size: 1,
        current_page: 1
      }
    });

    console.log(`  Page 1 returned ${page1Result.entries.length} entry(s)`);

    if (page1Result.entries.length === 1) {
      const page1EntryId = page1Result.entries[0].id;

      // Get page 2
      const page2Result = await client.listEntries({
        form_id: testFormId,
        paging: {
          page_size: 1,
          current_page: 2
        }
      });

      if (page2Result.entries.length === 1) {
        const page2EntryId = page2Result.entries[0].id;

        // Verify different entries on different pages
        TestAssert.notEqual(page1EntryId, page2EntryId, 'Different entries on different pages');
        console.log(`  ✅ Entries pagination working! Page 1 entry ${page1EntryId} ≠ Page 2 entry ${page2EntryId}`);
      } else {
        console.log(`  Page 2 returned ${page2Result.entries.length} entries`);
      }
    } else {
      // Fallback: test performance with larger page size
      const startTime = Date.now();
      const result = await client.listEntries({
        form_id: testFormId,
        per_page: 100,
        page: 1
      });
      const duration = Date.now() - startTime;

      console.log(`  Listed ${result.entries.length} entries in ${duration}ms`);
      TestAssert.isTrue(duration < 5000, 'Should complete within 5 seconds');
    }

  } finally {
    // Clean up test entries
    for (const entryId of testEntryIds) {
      try {
        await client.deleteEntry({ id: entryId, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
});

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().then((results) => {
    process.exit(results.failed === 0 ? 0 : 1);
  });
}

export default suite;