/**
 * Unit tests for field-registry utility functions.
 */

import test from 'node:test';
import assert from 'node:assert';
import { generateCompoundInputs, isCompoundField, getFieldDefinition } from '../field-definitions/field-registry.js';

test('generateCompoundInputs - address field', async (t) => {
  await t.test('generates US address inputs', () => {
    const field = { id: 5, type: 'address', addressType: 'us' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 6);
    assert.strictEqual(inputs[0].id, '5.1');
    assert.strictEqual(inputs[0].label, 'Street Address');
    assert.strictEqual(inputs[3].label, 'State');
    assert.strictEqual(inputs[4].label, 'ZIP Code');
  });

  await t.test('generates international address inputs', () => {
    const field = { id: 10, type: 'address', addressType: 'international' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 6);
    assert.strictEqual(inputs[3].label, 'State / Province');
    assert.strictEqual(inputs[4].label, 'ZIP / Postal Code');
  });

  await t.test('generates Canadian address inputs', () => {
    const field = { id: 3, type: 'address', addressType: 'canadian' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 6);
    assert.strictEqual(inputs[3].label, 'Province');
    assert.strictEqual(inputs[4].label, 'Postal Code');
  });

  await t.test('defaults to US format when addressType missing', () => {
    const field = { id: 1, type: 'address' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs[3].label, 'State');
    assert.strictEqual(inputs[4].label, 'ZIP Code');
  });
});

test('generateCompoundInputs - name field', async (t) => {
  await t.test('generates advanced name inputs', () => {
    const field = { id: 7, type: 'name', nameFormat: 'advanced' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 5);
    assert.strictEqual(inputs[0].id, '7.2');
    assert.strictEqual(inputs[0].label, 'Prefix');
    assert.strictEqual(inputs[1].id, '7.3');
    assert.strictEqual(inputs[1].label, 'First');
    assert.strictEqual(inputs[3].id, '7.6');
    assert.strictEqual(inputs[3].label, 'Last');
  });

  await t.test('generates simple name inputs', () => {
    const field = { id: 2, type: 'name', nameFormat: 'simple' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 2);
    assert.strictEqual(inputs[0].id, '2.3');
    assert.strictEqual(inputs[0].label, 'First');
    assert.strictEqual(inputs[1].id, '2.6');
    assert.strictEqual(inputs[1].label, 'Last');
  });

  await t.test('defaults to advanced format when nameFormat missing', () => {
    const field = { id: 1, type: 'name' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 5);
  });
});

test('generateCompoundInputs - creditcard field', async (t) => {
  await t.test('generates creditcard inputs', () => {
    const field = { id: 9, type: 'creditcard' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 5);
    assert.strictEqual(inputs[0].id, '9.1');
    assert.strictEqual(inputs[0].label, 'Card Number');
    assert.strictEqual(inputs[1].label, 'Expiration Date');
    assert.strictEqual(inputs[2].label, 'Security Code');
    assert.strictEqual(inputs[3].label, 'Cardholder Name');
    assert.strictEqual(inputs[4].label, 'Card Type');
  });
});

test('generateCompoundInputs - consent field', async (t) => {
  await t.test('generates consent inputs', () => {
    const field = { id: 4, type: 'consent' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs.length, 3);
    assert.strictEqual(inputs[0].id, '4.1');
    assert.strictEqual(inputs[0].label, 'Consent');
    assert.strictEqual(inputs[1].id, '4.2');
    assert.strictEqual(inputs[2].id, '4.3');
  });
});

test('generateCompoundInputs - non-compound fields', async (t) => {
  await t.test('returns null for text field', () => {
    const field = { id: 1, type: 'text' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs, null);
  });

  await t.test('returns null for email field', () => {
    const field = { id: 1, type: 'email' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs, null);
  });

  await t.test('returns null for unknown field type', () => {
    const field = { id: 1, type: 'nonexistent' };
    const inputs = generateCompoundInputs(field);

    assert.strictEqual(inputs, null);
  });
});

test('isCompoundField', async (t) => {
  await t.test('returns true for address', () => {
    assert.strictEqual(isCompoundField('address'), true);
  });

  await t.test('returns true for name', () => {
    assert.strictEqual(isCompoundField('name'), true);
  });

  await t.test('returns false for text', () => {
    assert.strictEqual(isCompoundField('text'), false);
  });

  await t.test('returns false for unknown type', () => {
    assert.strictEqual(isCompoundField('nonexistent'), false);
  });
});
