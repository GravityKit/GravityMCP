/**
 * Unit tests for FieldManager class
 * Tests field CRUD operations with mocked API client
 */

import test from 'node:test';
import assert from 'node:assert';
import { FieldManager } from '../field-operations/field-manager.js';

// Mock dependencies
const createMockApiClient = () => ({
  getForm: async (formId) => ({
    id: formId,
    title: 'Test Form',
    fields: [
      { id: 1, type: 'text', label: 'Name' },
      { id: 2, type: 'email', label: 'Email' },
      { id: 3, type: 'textarea', label: 'Message' }
    ]
  }),
  updateForm: async (form) => ({ form })
});

const createMockRegistry = () => ({
  text: {
    label: 'Single Line Text',
    category: 'standard',
    defaults: { size: 'medium' }
  },
  email: {
    label: 'Email',
    category: 'advanced',
    defaults: { size: 'medium' }
  },
  address: {
    label: 'Address',
    category: 'advanced',
    storage: { type: 'compound' },
    hasChoices: false
  },
  select: {
    label: 'Dropdown',
    category: 'standard',
    hasChoices: true
  },
  date: {
    label: 'Date',
    category: 'advanced'
  }
});

const createMockValidator = () => ({
  getWarnings: () => []
});

test('FieldManager - generateFieldId', async (t) => {
  const apiClient = createMockApiClient();
  const registry = createMockRegistry();
  const validator = createMockValidator();
  const manager = new FieldManager(apiClient, registry, validator);

  await t.test('generates next ID for existing fields', () => {
    const fields = [
      { id: 1 },
      { id: 3 },
      { id: 5 }
    ];
    const newId = manager.generateFieldId(fields);
    assert.strictEqual(newId, 6);
  });

  await t.test('generates ID 1 for empty fields array', () => {
    const newId = manager.generateFieldId([]);
    assert.strictEqual(newId, 1);
  });

  await t.test('handles non-numeric IDs', () => {
    const fields = [
      { id: 'abc' },
      { id: 2 },
      { id: '3' }
    ];
    const newId = manager.generateFieldId(fields);
    assert.strictEqual(newId, 4);
  });
});

test('FieldManager - createField', async (t) => {
  const apiClient = createMockApiClient();
  const registry = createMockRegistry();
  const validator = createMockValidator();
  const manager = new FieldManager(apiClient, registry, validator);

  await t.test('creates field with defaults', () => {
    const field = manager.createField(5, 'text', {}, registry.text);
    assert.strictEqual(field.id, 5);
    assert.strictEqual(field.type, 'text');
    assert.strictEqual(field.label, 'Single Line Text');
    assert.strictEqual(field.size, 'medium');
    assert.strictEqual(field.isRequired, false);
  });

  await t.test('creates field with custom properties', () => {
    const field = manager.createField(
      5, 
      'email', 
      { label: 'Work Email', isRequired: true },
      registry.email
    );
    assert.strictEqual(field.label, 'Work Email');
    assert.strictEqual(field.isRequired, true);
  });

  await t.test('creates choice field with default choices', () => {
    const field = manager.createField(5, 'select', {}, registry.select);
    assert.ok(Array.isArray(field.choices));
    assert.strictEqual(field.choices.length, 3);
    assert.strictEqual(field.choices[0].text, 'First Choice');
  });

  await t.test('creates date field with format defaults', () => {
    const field = manager.createField(5, 'date', {}, registry.date);
    assert.strictEqual(field.dateFormat, 'mdy');
    assert.strictEqual(field.dateType, 'datepicker');
  });
});

test('FieldManager - generateSubInputs', async (t) => {
  const apiClient = createMockApiClient();
  const registry = createMockRegistry();
  const validator = createMockValidator();
  const manager = new FieldManager(apiClient, registry, validator);

  await t.test('generates address field sub-inputs', () => {
    const field = { id: 10, type: 'address', addressType: 'us' };
    const subInputs = manager.generateSubInputs(field, registry.address);
    
    assert.strictEqual(subInputs.length, 6);
    assert.strictEqual(subInputs[0].id, '10.1');
    assert.strictEqual(subInputs[0].label, 'Street Address');
    assert.strictEqual(subInputs[4].label, 'ZIP Code');
  });

  await t.test('generates international address sub-inputs', () => {
    const field = { id: 10, type: 'address', addressType: 'international' };
    const subInputs = manager.generateSubInputs(field, registry.address);
    
    assert.strictEqual(subInputs[4].label, 'ZIP / Postal Code');
    assert.strictEqual(subInputs[3].label, 'State / Province');
  });

  await t.test('generates name field sub-inputs', () => {
    const field = { id: 15, type: 'name', nameFormat: 'advanced' };
    const fieldDef = { storage: { type: 'compound' } };
    const subInputs = manager.generateSubInputs(field, fieldDef);
    
    assert.strictEqual(subInputs.length, 5);
    assert.strictEqual(subInputs[0].id, '15.2'); // Prefix
    assert.strictEqual(subInputs[1].id, '15.3'); // First
    assert.strictEqual(subInputs[1].label, 'First');
  });
});

test('FieldManager - addField', async (t) => {
  await t.test('adds field to form successfully', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    // Mock position engine
    manager.positionEngine = {
      calculatePosition: () => 3
    };

    const result = await manager.addField(
      1,
      'text',
      { label: 'New Field' },
      { mode: 'append' }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.field.type, 'text');
    assert.strictEqual(result.field.label, 'New Field');
    assert.strictEqual(result.field.id, 4); // Next ID after 1,2,3
    assert.strictEqual(result.position.index, 3);
  });

  await t.test('rejects unknown field type', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);

    await assert.rejects(
      async () => await manager.addField(1, 'unknown_type', {}),
      /Unknown field type: unknown_type/
    );
  });
});

test('FieldManager - updateField', async (t) => {
  await t.test('updates field successfully', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    // Mock dependency tracker
    manager.dependencyTracker = {
      scanFormDependencies: () => ({ conditionalLogic: [] })
    };

    const result = await manager.updateField(
      1,
      2,
      { label: 'Updated Email', isRequired: true }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.field.label, 'Updated Email');
    assert.strictEqual(result.field.isRequired, true);
    assert.strictEqual(result.field.id, 2); // ID preserved
  });

  await t.test('warns about dependencies', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    // Mock dependency tracker with dependencies
    manager.dependencyTracker = {
      scanFormDependencies: () => ({
        conditionalLogic: [{ field_id: 1, field_label: 'Name' }]
      })
    };

    const result = await manager.updateField(1, 2, { label: 'Updated' });
    
    assert.strictEqual(result.success, true);
    assert.ok(result.warnings.dependencies.length > 0);
  });

  await t.test('throws for non-existent field', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);

    await assert.rejects(
      async () => await manager.updateField(1, 999, { label: 'Test' }),
      /Field 999 not found/
    );
  });
});

test('FieldManager - deleteField', async (t) => {
  await t.test('deletes field without dependencies', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    manager.dependencyTracker = {
      scanFormDependencies: () => ({ conditionalLogic: [] }),
      hasBreakingDependencies: () => false
    };

    const result = await manager.deleteField(1, 2);
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_field.id, 2);
    assert.strictEqual(result.deleted_field.type, 'email');
  });

  await t.test('blocks deletion with dependencies when not forced', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    manager.dependencyTracker = {
      scanFormDependencies: () => ({
        conditionalLogic: [{ field_id: 1 }]
      }),
      hasBreakingDependencies: () => true
    };

    const result = await manager.deleteField(1, 2, { force: false });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('dependencies'));
    assert.ok(result.suggestion.includes('force=true'));
  });

  await t.test('allows forced deletion with dependencies', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    manager.dependencyTracker = {
      scanFormDependencies: () => ({
        conditionalLogic: [{ field_id: 1 }]
      }),
      hasBreakingDependencies: () => true
    };

    const result = await manager.deleteField(1, 2, { force: true });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_field.id, 2);
  });

  await t.test('cleans up dependencies with cascade', async () => {
    const apiClient = createMockApiClient();
    const registry = createMockRegistry();
    const validator = createMockValidator();
    const manager = new FieldManager(apiClient, registry, validator);
    
    let cleanupCalled = false;
    manager.dependencyTracker = {
      scanFormDependencies: () => ({
        conditionalLogic: [{ field_id: 1 }]
      }),
      hasBreakingDependencies: () => true
    };
    
    // Override cleanupDependencies to track if called
    manager.cleanupDependencies = () => { cleanupCalled = true; };

    const result = await manager.deleteField(1, 2, { cascade: true, force: true });
    
    assert.strictEqual(result.success, true);
    assert.strictEqual(cleanupCalled, true);
    assert.ok(result.actions_taken.includes('Dependencies cleaned up'));
  });
});