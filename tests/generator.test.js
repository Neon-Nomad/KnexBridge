const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapDatabaseTypeToTS,
  convertName,
  convertTableName,
  generateTypeInterface,
  generateZodSchema,
  generateInsertUpdateTypes,
  generateRelationTypes,
} = require('../packages/core/dist/generator.js');
const { DEFAULT_CONFIG } = require('../packages/core/dist/constants.js');

const baseConfig = {
  ...DEFAULT_CONFIG,
  namingStrategy: 'camel',
  tableNameFormat: 'singular',
  generateRelations: true,
  generateInsertTypes: true,
  generateUpdateTypes: true,
};

const sampleTable = {
  name: 'users',
  columns: [
    {
      name: 'id',
      type: 'integer',
      nullable: false,
      isPrimaryKey: true,
      isUnique: true,
    },
    {
      name: 'email',
      type: 'varchar',
      nullable: false,
      isPrimaryKey: false,
      isUnique: true,
      comment: 'Primary email address',
    },
    {
      name: 'profile_id',
      type: 'integer',
      nullable: true,
      isPrimaryKey: false,
      isUnique: false,
    },
  ],
  foreign_keys: [
    {
      columnName: 'profile_id',
      foreignTableName: 'profiles',
      foreignColumnName: 'id',
    },
  ],
};

const relatedTable = {
  name: 'profiles',
  columns: [
    {
      name: 'id',
      type: 'integer',
      nullable: false,
      isPrimaryKey: true,
      isUnique: true,
    },
    {
      name: 'display_name',
      type: 'text',
      nullable: true,
      isPrimaryKey: false,
      isUnique: false,
    },
  ],
  foreign_keys: [],
};

test('mapDatabaseTypeToTS maps built-in types', () => {
  const { tsType, warning } = mapDatabaseTypeToTS('integer', {});
  assert.equal(tsType, 'number');
  assert.equal(warning, undefined);
});

test('mapDatabaseTypeToTS respects custom type mapping', () => {
  const result = mapDatabaseTypeToTS('jsonb', {
    customTypeMappings: { jsonb: 'Record<string, unknown>' },
  });
  assert.equal(result.tsType, 'Record<string, unknown>');
});

test('mapDatabaseTypeToTS supports date strategies and bigint', () => {
  const asString = mapDatabaseTypeToTS('timestamp', { dateStrategy: 'string' });
  assert.equal(asString.tsType, 'string');

  const asNumber = mapDatabaseTypeToTS('timestamp', { dateStrategy: 'number' });
  assert.equal(asNumber.tsType, 'number');

  const asBigInt = mapDatabaseTypeToTS('bigint', { useBigInt: true });
  assert.equal(asBigInt.tsType, 'bigint');
});

test('mapDatabaseTypeToTS warns on unknown types', () => {
  const result = mapDatabaseTypeToTS('mystery', {});
  assert.equal(result.tsType, 'unknown');
  assert.match(result.warning, /Unmapped database type/);
});

test('convertName handles multiple strategies', () => {
  assert.equal(convertName('user_profile', 'camel'), 'userProfile');
  assert.equal(convertName('user_profile', 'pascal'), 'UserProfile');
  assert.equal(convertName('userProfile', 'snake'), 'user_profile');
  assert.equal(convertName('users', 'preserve'), 'users');
});

test('convertTableName can singularize and pluralize', () => {
  assert.equal(convertTableName('people', 'singular'), 'person');
  assert.equal(convertTableName('company', 'plural'), 'companies');
  assert.equal(convertTableName('data', 'preserve'), 'data');
});

test('generateTypeInterface outputs optional fields and comments', () => {
  const { code } = generateTypeInterface(sampleTable, baseConfig);
  assert.match(code, /export interface user/);
  assert.match(code, /email: string/);
  assert.match(code, /profileId\?: number/);
  assert.match(code, /\*\* Primary email address \*/);
});

test('generateZodSchema marks nullable columns correctly', () => {
  const { code } = generateZodSchema(sampleTable, baseConfig);
  assert.match(code, /z\.object/);
  assert.match(code, /email: z\.string\(\)/);
  assert.match(code, /profileId: z\.number\(\)\.nullable\(\)/);
});

test('generateInsertUpdateTypes respects exclusions', () => {
  const code = generateInsertUpdateTypes(sampleTable, {
    ...baseConfig,
    excludeFromInsert: ['created_at', 'id'],
    excludeFromUpdate: ['updated_at', 'id'],
  });

  assert.match(code, /userInsert/);
  assert.ok(!code.includes('id'));
  assert.match(code, /userUpdate/);
});

test('generateRelationTypes derives relation fields', () => {
  const code = generateRelationTypes(sampleTable, [sampleTable, relatedTable], baseConfig);
  assert.match(code, /export interface userRelations extends user/);
  assert.match(code, /profile\?: profile/);
});
