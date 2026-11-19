import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeGrowthInput } from './numberUtils.js';

test('sanitizeGrowthInput accepts valid values', () => {
  assert.deepEqual(sanitizeGrowthInput('12.5'), { value: 12.5, valid: true, message: null });
  assert.deepEqual(sanitizeGrowthInput('1e2'), { value: 100, valid: true, message: null });
});

test('sanitizeGrowthInput rejects empty and invalid input', () => {
  assert.deepEqual(sanitizeGrowthInput(''), { value: null, valid: false, message: 'Enter a valid numeric value.' });
  assert.deepEqual(sanitizeGrowthInput('abc'), { value: null, valid: false, message: 'Enter a valid numeric value.' });
});

test('sanitizeGrowthInput rejects unsafe large numbers', () => {
  assert.deepEqual(sanitizeGrowthInput('1e309'), { value: null, valid: false, message: 'Value is out of range.' });
});

test('sanitizeGrowthInput keeps valid values after invalid ones', () => {
  const invalid = sanitizeGrowthInput('abc');
  const valid = sanitizeGrowthInput('67.25');
  assert.equal(invalid.valid, false);
  assert.deepEqual(valid, { value: 67.25, valid: true, message: null });
});
