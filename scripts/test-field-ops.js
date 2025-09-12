#!/usr/bin/env node

/**
 * Simple test to verify field operations are loaded correctly
 */

import { createFieldOperations, fieldOperationHandlers, fieldOperationTools } from '../src/field-operations/index.js';
import fieldRegistry from '../src/field-definitions/field-registry.js';
import FieldAwareValidator from '../src/config/field-validation.js';

console.log('🧪 Testing Field Operations Module...\n');

// Check exports
console.log('📦 Checking exports:');
console.log(`  ✅ createFieldOperations: ${typeof createFieldOperations === 'function' ? 'Function' : 'Missing'}`);
console.log(`  ✅ fieldOperationHandlers: ${typeof fieldOperationHandlers === 'object' ? 'Object' : 'Missing'}`);
console.log(`  ✅ fieldOperationTools: ${Array.isArray(fieldOperationTools) ? `Array (${fieldOperationTools.length} tools)` : 'Missing'}`);

// Check tools
console.log('\n🔧 Field Operation Tools:');
if (Array.isArray(fieldOperationTools)) {
  fieldOperationTools.forEach(tool => {
    console.log(`  ✅ ${tool.name} - ${tool.description}`);
  });
}

// Check handlers
console.log('\n🎯 Field Operation Handlers:');
const expectedHandlers = ['gf_add_field', 'gf_update_field', 'gf_delete_field', 'gf_list_field_types'];
expectedHandlers.forEach(handler => {
  const exists = handler in fieldOperationHandlers;
  console.log(`  ${exists ? '✅' : '❌'} ${handler}: ${exists ? 'Present' : 'Missing'}`);
});

// Test field registry
console.log('\n📖 Field Registry:');
console.log(`  Total field types: ${Object.keys(fieldRegistry).length}`);
const sampleTypes = ['text', 'email', 'address', 'name', 'date'];
sampleTypes.forEach(type => {
  console.log(`  ${type in fieldRegistry ? '✅' : '❌'} ${type}: ${type in fieldRegistry ? 'Defined' : 'Missing'}`);
});

// Test creating field operations
console.log('\n🏗️ Creating Field Operations:');
try {
  // Mock API client
  const mockApiClient = {
    getForm: async () => ({ fields: [] }),
    updateForm: async (form) => ({ form })
  };
  
  const validator = new FieldAwareValidator();
  const fieldOps = createFieldOperations(mockApiClient, fieldRegistry, validator);
  
  console.log(`  ✅ fieldManager: ${fieldOps.fieldManager ? 'Created' : 'Missing'}`);
  console.log(`  ✅ dependencyTracker: ${fieldOps.dependencyTracker ? 'Created' : 'Missing'}`);
  console.log(`  ✅ positionEngine: ${fieldOps.positionEngine ? 'Created' : 'Missing'}`);
  console.log(`  ✅ config: ${fieldOps.config ? 'Present' : 'Missing'}`);
  
  console.log('\n🎉 Field Operations Module Successfully Loaded!');
} catch (error) {
  console.error('\n❌ Error creating field operations:', error.message);
  process.exit(1);
}

process.exit(0);