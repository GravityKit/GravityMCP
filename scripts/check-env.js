#!/usr/bin/env node

/**
 * Environment Check Script for Gravity MCP
 * Validates environment configuration and tests API connection
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { AuthManager, validateRestApiAccess } from '../src/config/auth.js';

// Load environment variables
dotenv.config();

console.log('🔍 Gravity MCP - Environment Check');
console.log('='.repeat(50));

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

console.log(`\n📦 Node.js Version: ${nodeVersion}`);
if (majorVersion < 20) {
  console.error('❌ Node.js 20.0.0 or higher is required');
  process.exit(1);
} else {
  console.log('✅ Node.js version is compatible');
}

// Check required environment variables
console.log('\n🔐 Checking Environment Variables...');

const required = [
  'GRAVITY_FORMS_CONSUMER_KEY',
  'GRAVITY_FORMS_CONSUMER_SECRET',
  'GRAVITY_FORMS_BASE_URL'
];

const missing = [];
const configured = [];

required.forEach(key => {
  if (!process.env[key]) {
    missing.push(key);
    console.log(`❌ ${key}: Not configured`);
  } else {
    configured.push(key);
    const value = process.env[key];
    // Mask all sensitive keys, not just those with SECRET in the name
    const masked = key.includes('SECRET') || key.includes('KEY')
      ? value.substring(0, 3) + '****' + value.substring(value.length - 2)
      : value;
    console.log(`✅ ${key}: ${masked}`);
  }
});

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables!');
  console.error('Please configure the following in your .env file:');
  missing.forEach(key => {
    console.error(`  - ${key}`);
  });
  process.exit(1);
}

// Check optional settings
console.log('\n⚙️  Optional Settings:');

const optional = {
  'GRAVITY_FORMS_AUTH_METHOD': process.env.GRAVITY_FORMS_AUTH_METHOD || 'basic',
  'GRAVITY_FORMS_ALLOW_DELETE': process.env.GRAVITY_FORMS_ALLOW_DELETE || 'false',
  'GRAVITY_FORMS_TIMEOUT': process.env.GRAVITY_FORMS_TIMEOUT || '30000',
  'GRAVITY_FORMS_DEBUG': process.env.GRAVITY_FORMS_DEBUG || 'false'
};

Object.entries(optional).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Validate Base URL format
console.log('\n🌐 Validating Base URL...');
const baseUrl = process.env.GRAVITY_FORMS_BASE_URL;

if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
  console.error('❌ Base URL must start with http:// or https://');
  process.exit(1);
}

const isHttps = baseUrl.startsWith('https://');
const authMethod = optional.GRAVITY_FORMS_AUTH_METHOD;

console.log(`  Protocol: ${isHttps ? 'HTTPS ✅' : 'HTTP ⚠️'}`);
console.log(`  Auth Method: ${authMethod}`);

if (authMethod === 'basic' && !isHttps) {
  console.warn('⚠️  Warning: Basic Auth requires HTTPS for security');
  console.log('  Will use OAuth 1.0a as fallback');
}

// Test API connection
console.log('\n🔌 Testing API Connection...');

async function testConnection() {
  try {
    // Create auth manager
    const authManager = new AuthManager(process.env);

    // Create HTTP client
    const httpClient = axios.create({
      baseURL: `${baseUrl}/wp-json/gf/v2`,
      timeout: parseInt(optional.GRAVITY_FORMS_TIMEOUT)
    });

    // Test connection
    console.log('  Authenticating...');
    const connectionResult = await authManager.testConnection(httpClient);

    if (connectionResult.success) {
      console.log(`✅ Successfully connected using ${connectionResult.method}`);

      // Validate REST API access
      console.log('\n🔍 Validating REST API Access...');
      const validation = await validateRestApiAccess(httpClient, authManager);

      if (validation.available) {
        console.log(`✅ REST API is available`);
        console.log(`  Coverage: ${validation.coverage} endpoints`);

        if (validation.fullAccess) {
          console.log('✅ Full API access confirmed');
        } else {
          console.warn('⚠️  Partial API access detected');
          validation.endpoints.forEach(endpoint => {
            const status = endpoint.available ? '✅' : '❌';
            console.log(`  ${status} ${endpoint.name}`);
          });
        }
      } else {
        console.error('❌ REST API validation failed:', validation.error);
        process.exit(1);
      }
    } else {
      console.error(`❌ Connection failed: ${connectionResult.error}`);
      if (connectionResult.details) {
        console.error('  Details:', connectionResult.details);
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);

    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Message:', error.response.data?.message || 'Unknown error');
    }

    process.exit(1);
  }
}

// Test delete permission
console.log('\n🗑️  Delete Operations:');
const deleteEnabled = optional.GRAVITY_FORMS_ALLOW_DELETE === 'true';
console.log(`  Status: ${deleteEnabled ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);

if (deleteEnabled) {
  console.warn('  ⚠️  Warning: Delete operations can permanently remove data!');
  console.warn('  ⚠️  Use with extreme caution in production environments');
}

// Run connection test
testConnection().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ Environment check completed successfully!');
  console.log('Your Gravity MCP is ready to use.');
  console.log('\nTo start the server, run:');
  console.log('  npm start');
  console.log('\nTo run tests:');
  console.log('  npm test');
}).catch(error => {
  console.error('\n' + '='.repeat(50));
  console.error('❌ Environment check failed!');
  console.error('Please fix the issues above and try again.');
  process.exit(1);
});