const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../packages/core/dist/config.js');
const { DEFAULT_CONFIG } = require('../packages/core/dist/constants.js');

test('validateConfig merges defaults with overrides', () => {
  const config = validateConfig({
    dateStrategy: 'string',
    namingStrategy: 'pascal',
    tableNameFormat: 'plural',
    includeTables: ['users'],
  });

  assert.equal(config.dateStrategy, 'string');
  assert.equal(config.namingStrategy, 'pascal');
  assert.equal(config.tableNameFormat, 'plural');
  assert.deepEqual(config.includeTables, ['users']);
  assert.equal(config.generateTypes, DEFAULT_CONFIG.generateTypes);
});

test('validateConfig rejects invalid enum values', () => {
  assert.throws(
    () => validateConfig({ dateStrategy: 'iso' }),
    /Unsupported date strategy/
  );

  assert.throws(
    () => validateConfig({ namingStrategy: 'kebab' }),
    /Unsupported naming strategy/
  );

  assert.throws(
    () => validateConfig({ tableNameFormat: 'random' }),
    /Unsupported table name format/
  );
});

test('validateConfig enforces schema name rules and mutual exclusivity', () => {
  assert.throws(
    () => validateConfig({ schemaName: '123-invalid' }),
    /Invalid schema name/
  );

  assert.throws(
    () => validateConfig({ includeTables: ['users'], excludeTables: ['users'] }),
    /Tables cannot be included/
  );
});

test('validateConfig validates custom mappings and exclusions', () => {
  assert.throws(
    () => validateConfig({ customTypeMappings: { '': 'string' } }),
    /must not be empty/
  );

  assert.throws(
    () => validateConfig({ excludeFromInsert: [''] }),
    /excludeFromInsert/
  );

  assert.throws(
    () => validateConfig({ excludeFromUpdate: [' '] }),
    /excludeFromUpdate/
  );

  assert.throws(
    () => validateConfig({ generateRelations: true, generateTypes: false }),
    /requires generateTypes/
  );
});
