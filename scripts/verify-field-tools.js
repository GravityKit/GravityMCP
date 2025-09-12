#!/usr/bin/env node

/**
 * Verification script for field operations tools
 * Tests that all 4 new field operation tools are properly registered
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '..', 'src', 'index.js');

console.log('🔍 Verifying Field Operations Tools Integration...\n');

// Start the server and check for tools
const serverProcess = spawn('node', [serverPath], {
  env: {
    ...process.env,
    GRAVITY_FORMS_CONSUMER_KEY: process.env.GRAVITY_FORMS_CONSUMER_KEY || 'test_key',
    GRAVITY_FORMS_CONSUMER_SECRET: process.env.GRAVITY_FORMS_CONSUMER_SECRET || 'test_secret',
    GRAVITY_FORMS_BASE_URL: process.env.GRAVITY_FORMS_BASE_URL || 'https://test.com'
  }
});

let output = '';
let errorOutput = '';

serverProcess.stdout.on('data', (data) => {
  output += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();

  // Check for successful initialization
  if (errorOutput.includes('Field operations infrastructure initialized')) {
    console.log('✅ Field operations infrastructure initialized successfully');
  }

  if (errorOutput.includes('Gravity MCP running on stdio')) {
    console.log('✅ Server started successfully');

    // Send a list tools request
    const listToolsRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    };

    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }
});

serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());

    if (response.result && response.result.tools) {
      const tools = response.result.tools;
      const fieldTools = [
        'gf_add_field',
        'gf_update_field',
        'gf_delete_field',
        'gf_list_field_types'
      ];

      console.log('\n📋 Checking for field operation tools:');

      let allFound = true;
      fieldTools.forEach(toolName => {
        const found = tools.some(tool => tool.name === toolName);
        if (found) {
          console.log(`  ✅ ${toolName} - Found`);
        } else {
          console.log(`  ❌ ${toolName} - Missing`);
          allFound = false;
        }
      });

      console.log(`\n📊 Summary:`);
      console.log(`  Total tools registered: ${tools.length}`);
      console.log(`  Field operations tools: ${fieldTools.filter(t => tools.some(tool => tool.name === t)).length}/${fieldTools.length}`);

      if (allFound) {
        console.log('\n🎉 All field operation tools successfully integrated!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Some field operation tools are missing');
        process.exit(1);
      }
    }
  } catch (e) {
    // Not JSON, probably server output
  }
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout - killing server process');
  serverProcess.kill();
  process.exit(1);
}, 5000);

// Handle errors
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

// Clean up on exit
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});