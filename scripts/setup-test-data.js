#!/usr/bin/env node

/**
 * Test Data Setup Script for Gravity MCP
 * Creates test forms, entries, and feeds for testing and development
 */

import dotenv from 'dotenv';
import GravityFormsClient from '../src/gravity-forms-client.js';

// Load environment variables
dotenv.config();

console.log('🔧 Gravity MCP - Test Data Setup');
console.log('='.repeat(50));

// Parse command line arguments
const args = process.argv.slice(2);
const forceProduction = args.includes('--force-production');

// Safety check: Require test credentials unless explicitly forcing production
if (!forceProduction) {
  // Check for test environment credentials
  const hasTestCredentials = process.env.GRAVITY_FORMS_TEST_BASE_URL &&
                            process.env.GRAVITY_FORMS_TEST_CONSUMER_KEY &&
                            process.env.GRAVITY_FORMS_TEST_CONSUMER_SECRET;

  if (!hasTestCredentials) {
    console.error('\n🛑 SAFETY CHECK FAILED: Test credentials not configured!\n');
    console.error('This script creates test data and should NOT run on production sites.');
    console.error('To use this script safely, configure test credentials in your .env file:\n');
    console.error('  GRAVITY_FORMS_TEST_BASE_URL=https://staging.yoursite.com');
    console.error('  GRAVITY_FORMS_TEST_CONSUMER_KEY=ck_your_test_key');
    console.error('  GRAVITY_FORMS_TEST_CONSUMER_SECRET=cs_your_test_secret\n');
    console.error('If you REALLY need to use production (not recommended), run:');
    console.error('  npm run setup-test-data -- --force-production\n');
    console.error('⚠️  WARNING: Using production for test data can:');
    console.error('  - Pollute production data');
    console.error('  - Trigger real customer notifications');
    console.error('  - Affect analytics and reporting');
    console.error('  - Violate compliance requirements\n');
    process.exit(1);
  }

  // Use test credentials
  var config = {
    GRAVITY_FORMS_CONSUMER_KEY: process.env.GRAVITY_FORMS_TEST_CONSUMER_KEY,
    GRAVITY_FORMS_CONSUMER_SECRET: process.env.GRAVITY_FORMS_TEST_CONSUMER_SECRET,
    GRAVITY_FORMS_BASE_URL: process.env.GRAVITY_FORMS_TEST_BASE_URL,
    GRAVITY_FORMS_AUTH_METHOD: process.env.GRAVITY_FORMS_AUTH_METHOD || 'basic',
    GRAVITY_FORMS_ALLOW_DELETE: 'true'
  };

  console.log('✅ Using TEST environment (safe mode)\n');
} else {
  // Force production mode - show scary warnings
  console.log('\n⚠️ ⚠️ ⚠️  FORCING PRODUCTION MODE ⚠️ ⚠️ ⚠️');
  console.log('You are about to create test data on a PRODUCTION site!');
  console.log('This is NOT recommended and may cause:');
  console.log('  - Customer confusion from test data');
  console.log('  - Contamination of production analytics');
  console.log('  - Unwanted notifications to real users');
  console.log('  - Compliance and data governance issues\n');

  // Still require production credentials
  if (!process.env.GRAVITY_FORMS_CONSUMER_KEY ||
      !process.env.GRAVITY_FORMS_CONSUMER_SECRET ||
      !process.env.GRAVITY_FORMS_BASE_URL) {
    console.error('❌ Missing production credentials!');
    console.error('Even with --force-production, you need to configure:');
    console.error('  - GRAVITY_FORMS_CONSUMER_KEY');
    console.error('  - GRAVITY_FORMS_CONSUMER_SECRET');
    console.error('  - GRAVITY_FORMS_BASE_URL');
    process.exit(1);
  }

  var config = {
    GRAVITY_FORMS_CONSUMER_KEY: process.env.GRAVITY_FORMS_CONSUMER_KEY,
    GRAVITY_FORMS_CONSUMER_SECRET: process.env.GRAVITY_FORMS_CONSUMER_SECRET,
    GRAVITY_FORMS_BASE_URL: process.env.GRAVITY_FORMS_BASE_URL,
    GRAVITY_FORMS_AUTH_METHOD: process.env.GRAVITY_FORMS_AUTH_METHOD || 'basic',
    GRAVITY_FORMS_ALLOW_DELETE: 'true'
  };

  console.log('🚨 Using PRODUCTION environment (dangerous mode)\n');
}

console.log(`\n📍 Target: ${config.GRAVITY_FORMS_BASE_URL}`);
console.log(`🔐 Auth Method: ${config.GRAVITY_FORMS_AUTH_METHOD}`);
console.log(`🗑️  Delete Enabled: Yes (for cleanup)\n`);

// Create client
const client = new GravityFormsClient(config);

// Track created items for summary
const created = {
  forms: [],
  entries: [],
  feeds: []
};

// Test data definitions
const testForms = [
  {
    title: 'Contact Form (Test)',
    description: 'Simple contact form for testing',
    fields: [
      {
        id: 1,
        type: 'text',
        label: 'Name',
        isRequired: true,
        placeholder: 'Enter your full name'
      },
      {
        id: 2,
        type: 'email',
        label: 'Email Address',
        isRequired: true,
        placeholder: 'your@email.com'
      },
      {
        id: 3,
        type: 'phone',
        label: 'Phone Number',
        isRequired: false,
        phoneFormat: 'standard'
      },
      {
        id: 4,
        type: 'textarea',
        label: 'Message',
        isRequired: true,
        placeholder: 'How can we help you?',
        maxLength: 500
      }
    ],
    button: {
      text: 'Send Message'
    },
    confirmations: [{
      type: 'message',
      message: '<p>Thank you for contacting us! We\'ll respond within 24 hours.</p>'
    }],
    notifications: [{
      name: 'Admin Notification',
      to: '{admin_email}',
      subject: 'New Contact Form Submission',
      message: 'You have a new contact form submission from {Name:1}.'
    }]
  },
  {
    title: 'Newsletter Signup (Test)',
    description: 'Email subscription form for testing',
    fields: [
      {
        id: 1,
        type: 'email',
        label: 'Email Address',
        isRequired: true,
        placeholder: 'your@email.com'
      },
      {
        id: 2,
        type: 'text',
        label: 'First Name',
        isRequired: false
      },
      {
        id: 3,
        type: 'text',
        label: 'Last Name',
        isRequired: false
      },
      {
        id: 4,
        type: 'checkbox',
        label: 'Interests',
        choices: [
          { text: 'Product Updates', value: 'updates' },
          { text: 'Tips & Tutorials', value: 'tutorials' },
          { text: 'Special Offers', value: 'offers' }
        ]
      },
      {
        id: 5,
        type: 'consent',
        label: 'Privacy Policy',
        checkboxLabel: 'I agree to the privacy policy',
        isRequired: true
      }
    ],
    button: {
      text: 'Subscribe'
    },
    confirmations: [{
      type: 'message',
      message: '<p>Success! Please check your email to confirm your subscription.</p>'
    }]
  },
  {
    title: 'Multi-Page Survey (Test)',
    description: 'Multi-page form for testing page progression',
    fields: [
      {
        id: 1,
        type: 'page',
        label: 'Page 1: Personal Information'
      },
      {
        id: 2,
        type: 'text',
        label: 'First Name',
        isRequired: true
      },
      {
        id: 3,
        type: 'text',
        label: 'Last Name',
        isRequired: true
      },
      {
        id: 4,
        type: 'email',
        label: 'Email',
        isRequired: true
      },
      {
        id: 5,
        type: 'page',
        label: 'Page 2: Feedback'
      },
      {
        id: 6,
        type: 'radio',
        label: 'How satisfied are you?',
        isRequired: true,
        choices: [
          { text: 'Very Satisfied', value: '5' },
          { text: 'Satisfied', value: '4' },
          { text: 'Neutral', value: '3' },
          { text: 'Unsatisfied', value: '2' },
          { text: 'Very Unsatisfied', value: '1' }
        ]
      },
      {
        id: 7,
        type: 'textarea',
        label: 'Additional Comments',
        isRequired: false
      },
      {
        id: 8,
        type: 'page',
        label: 'Page 3: Complete'
      },
      {
        id: 9,
        type: 'html',
        content: '<p>Thank you for completing our survey!</p>'
      }
    ],
    button: {
      text: 'Submit Survey'
    },
    confirmations: [{
      type: 'message',
      message: '<p>Thank you for your feedback!</p>'
    }]
  }
];

// Sample entries for each form
const sampleEntries = [
  {
    '1': 'John Doe',
    '2': 'john.doe@example.com',
    '3': '555-123-4567',
    '4': 'I have a question about your services.'
  },
  {
    '1': 'Jane Smith',
    '2': 'jane.smith@example.com',
    '3': '555-987-6543',
    '4': 'Please contact me regarding a project.'
  },
  {
    '1': 'Test User',
    '2': 'test@example.com',
    '3': '',
    '4': 'This is a test message for development.'
  }
];

async function setupTestData() {
  try {
    // Test connection
    console.log('🔌 Testing connection...');
    await client.initialize();
    console.log('✅ Connected successfully!\n');

    // Create test forms
    console.log('📝 Creating test forms...');

    for (const formData of testForms) {
      try {
        const result = await client.createForm(formData);
        created.forms.push({
          id: result.form.id,
          title: result.form.title
        });
        console.log(`  ✅ Created: ${result.form.title} (ID: ${result.form.id})`);

        // Create sample entries for the first form
        if (created.forms.length === 1) {
          console.log('  📊 Adding sample entries...');

          for (const entryData of sampleEntries) {
            const entryResult = await client.createEntry({
              form_id: result.form.id,
              ...entryData
            });
            created.entries.push({
              id: entryResult.entry.id,
              form_id: result.form.id
            });
            console.log(`    ✅ Entry ${entryResult.entry.id} created`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to create form: ${error.message}`);
      }
    }

    // Try to create a feed if MailChimp is available
    if (created.forms.length > 0) {
      console.log('\n🔗 Attempting to create test feed...');

      try {
        const feedResult = await client.createFeed({
          addon_slug: 'gravityformsmailchimp',
          form_id: created.forms[0].id,
          is_active: false,
          meta: {
            feedName: 'Test MailChimp Feed',
            mailchimpList: 'test_list',
            mappedFields_EMAIL: '2',
            mappedFields_FNAME: '1'
          }
        });

        created.feeds.push({
          id: feedResult.feed.id,
          addon: 'gravityformsmailchimp',
          form_id: created.forms[0].id
        });
        console.log(`  ✅ Created MailChimp feed (ID: ${feedResult.feed.id})`);
      } catch (error) {
        console.log('  ℹ️  Feed creation skipped (addon may not be installed)');
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test Data Setup Complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Forms created: ${created.forms.length}`);
    console.log(`  - Entries created: ${created.entries.length}`);
    console.log(`  - Feeds created: ${created.feeds.length}`);

    if (created.forms.length > 0) {
      console.log('\n📋 Created Forms:');
      created.forms.forEach(form => {
        console.log(`  - ${form.title} (ID: ${form.id})`);
      });
    }

    console.log('\n💡 Tips:');
    console.log('  - Run "npm test" to test with this data');
    console.log('  - Run "npm run inspect" to use with MCP inspector');
    console.log('  - Use the form IDs above in your testing');

    // Ask about cleanup
    console.log('\n🗑️  Cleanup Option:');
    console.log('  To remove test data, run this script with --cleanup');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);

    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Details:', error.response.data);
    }

    process.exit(1);
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // List all forms
    const formsResult = await client.listForms();
    const testForms = formsResult.forms.filter(f =>
      f.title.includes('(Test)') || f.title.includes('test')
    );

    if (testForms.length === 0) {
      console.log('ℹ️  No test forms found to clean up');
      return;
    }

    console.log(`Found ${testForms.length} test forms to clean up:\n`);

    for (const form of testForms) {
      console.log(`Deleting: ${form.title} (ID: ${form.id})`);

      // Delete entries first
      try {
        const entriesResult = await client.listEntries({ form_id: form.id });

        if (entriesResult.entries.length > 0) {
          console.log(`  Deleting ${entriesResult.entries.length} entries...`);

          for (const entry of entriesResult.entries) {
            await client.deleteEntry({ id: entry.id, force: true });
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Could not delete entries: ${error.message}`);
      }

      // Delete feeds
      try {
        const feedsResult = await client.listFormFeeds({ form_id: form.id });

        if (feedsResult.feeds && feedsResult.feeds.length > 0) {
          console.log(`  Deleting ${feedsResult.feeds.length} feeds...`);

          for (const feed of feedsResult.feeds) {
            await client.deleteFeed({ id: feed.id });
          }
        }
      } catch (error) {
        // Feeds might not be available
      }

      // Delete form
      try {
        await client.deleteForm({ id: form.id, force: true });
        console.log(`  ✅ Form deleted\n`);
      } catch (error) {
        console.error(`  ❌ Could not delete form: ${error.message}\n`);
      }
    }

    console.log('✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Main execution
// Note: args already parsed at top of file for safety checks

if (args.includes('--cleanup') || args.includes('-c')) {
  cleanupTestData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('\nUsage: node scripts/setup-test-data.js [options]');
  console.log('\nOptions:');
  console.log('  --cleanup, -c        Remove all test data');
  console.log('  --force-production   DANGEROUS: Allow using production site for test data');
  console.log('  --help, -h           Show this help message');
  console.log('\nSafety Requirements:');
  console.log('  - Test credentials must be configured (GRAVITY_FORMS_TEST_*)');
  console.log('  - Script will fail if test credentials are missing');
  console.log('  - Use --force-production only in exceptional circumstances');
  console.log('\nWithout options, creates test forms and entries on TEST site.');
} else {
  setupTestData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}