#!/usr/bin/env node

/**
 * Test script to verify MCP server output formatting
 * This helps understand why tools return no visible output
 */

import GravityFormsClient from '../src/gravity-forms-client.js';
import { MockHttpClient, MockResponse } from '../src/tests/helpers.js';
import dotenv from 'dotenv';

dotenv.config();

// Create a test environment
const testEnv = {
  GRAVITY_FORMS_CONSUMER_KEY: 'ck_test',
  GRAVITY_FORMS_CONSUMER_SECRET: 'cs_test',
  GRAVITY_FORMS_BASE_URL: 'https://test.example.com',
  GRAVITY_FORMS_ALLOW_DELETE: 'false',
  GRAVITY_FORMS_DEBUG: 'false'
};

async function testServerOutput() {
  console.log('🧪 Testing MCP Server Output Formatting\n');
  console.log('=' .repeat(50));
  
  // Create client with mock HTTP
  const client = new GravityFormsClient(testEnv);
  const mockHttpClient = new MockHttpClient();
  client.httpClient = mockHttpClient;
  
  // Test 1: List Forms with mock data
  console.log('\n📋 Test 1: List Forms');
  console.log('-'.repeat(30));
  
  // Set up mock response
  mockHttpClient.setMockResponse('GET', '/forms', new MockResponse([
    {
      id: 1,
      title: 'Contact Form',
      description: 'Simple contact form',
      is_active: true,
      date_created: '2024-01-01 12:00:00',
      entries_count: 42
    },
    {
      id: 2,
      title: 'Survey Form',
      description: 'Customer satisfaction survey',
      is_active: true,
      date_created: '2024-01-02 13:00:00',
      entries_count: 156
    }
  ], 200, {
    'x-wp-total': '2',
    'x-wp-totalpages': '1'
  }));
  
  try {
    const result = await client.listForms({ per_page: 10 });
    console.log('✅ Success! Response structure:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: Get specific form
  console.log('\n📋 Test 2: Get Specific Form');
  console.log('-'.repeat(30));
  
  mockHttpClient.setMockResponse('GET', '/forms/1', new MockResponse({
    id: 1,
    title: 'Contact Form',
    description: 'Simple contact form',
    is_active: true,
    fields: [
      {
        id: 1,
        label: 'Name',
        type: 'text',
        required: true
      },
      {
        id: 2,
        label: 'Email',
        type: 'email',
        required: true
      },
      {
        id: 3,
        label: 'Message',
        type: 'textarea',
        required: false
      }
    ]
  }));
  
  try {
    const result = await client.getForm({ id: 1 });
    console.log('✅ Success! Response structure:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 3: Create entry
  console.log('\n📋 Test 3: Create Entry');
  console.log('-'.repeat(30));
  
  mockHttpClient.setMockResponse('POST', '/entries', new MockResponse({
    id: 123,
    form_id: 1,
    status: 'active',
    created_by: 1,
    date_created: '2024-01-15 10:30:00',
    '1': 'John Doe',
    '2': 'john@example.com',
    '3': 'This is a test message'
  }));
  
  try {
    const result = await client.createEntry({
      form_id: 1,
      '1': 'John Doe',
      '2': 'john@example.com',
      '3': 'This is a test message'
    });
    console.log('✅ Success! Response structure:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 4: How the MCP wrapper affects output
  console.log('\n📋 Test 4: MCP Wrapper Simulation');
  console.log('-'.repeat(30));
  
  function wrapHandler(handler) {
    return async (params) => {
      try {
        const result = await handler(params);
        return {
          success: true,
          ...result
        };
      } catch (error) {
        return {
          error: error.message,
          details: error.details || error.message,
          success: false
        };
      }
    };
  }
  
  // Simulate MCP wrapper
  const wrappedListForms = wrapHandler(async (params) => {
    return await client.listForms(params);
  });
  
  const mcpResult = await wrappedListForms({ per_page: 5 });
  console.log('MCP Wrapped Response:');
  console.log(JSON.stringify(mcpResult, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Summary:');
  console.log('- Client methods return data properly');
  console.log('- MCP wrapper adds success flag and spreads result');
  console.log('- Output should be visible in MCP tool results');
  console.log('- If not visible, likely due to:');
  console.log('  1. Missing/invalid API credentials');
  console.log('  2. MCP inspector display limitations');
  console.log('  3. Connection issues with actual API');
}

// Run tests
testServerOutput().catch(console.error);