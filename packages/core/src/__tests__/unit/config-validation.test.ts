import { validateConfig } from '../../../config';
import { DEFAULT_CONFIG } from '../../../constants';

describe('validateConfig', () => {
  it('returns defaults when no overrides provided', () => {
    const config = validateConfig();
    expect(config).toMatchObject(DEFAULT_CONFIG);
  });

  it('allows overriding naming strategy', () => {
    const config = validateConfig({ namingStrategy: 'snake' });
    expect(config.namingStrategy).toBe('snake');
  });

  it('allows overriding date strategy', () => {
    const config = validateConfig({ dateStrategy: 'string' });
    expect(config.dateStrategy).toBe('string');
  });

  it('rejects invalid date strategy', () => {
    expect(() => validateConfig({ dateStrategy: 'iso' as any })).toThrow('Unsupported date strategy');
  });

  it('rejects invalid naming strategy', () => {
    expect(() => validateConfig({ namingStrategy: 'lower' as any })).toThrow('Unsupported naming strategy');
  });

  it('rejects invalid table name format', () => {
    expect(() => validateConfig({ tableNameFormat: 'upper' as any })).toThrow('Unsupported table name format');
  });

  it('validates schema name characters', () => {
    expect(() => validateConfig({ schemaName: '123invalid' })).toThrow('Invalid schema name');
  });

  it('allows valid schema name', () => {
    const config = validateConfig({ schemaName: 'custom_schema' });
    expect(config.schemaName).toBe('custom_schema');
  });

  it('rejects overlapping include/exclude tables', () => {
    expect(() => validateConfig({ includeTables: ['users'], excludeTables: ['users'] })).toThrow(
      'Tables cannot be included and excluded simultaneously',
    );
  });

  it('allows separate include/exclude tables', () => {
    const config = validateConfig({ includeTables: ['users'], excludeTables: ['posts'] });
    expect(config.includeTables).toEqual(['users']);
  });

  it('rejects empty custom type mapping keys', () => {
    expect(() => validateConfig({ customTypeMappings: { '': 'string' } })).toThrow('Custom type mapping keys');
  });

  it('rejects empty custom type mapping value', () => {
    expect(() => validateConfig({ customTypeMappings: { uuid: '' } })).toThrow('must specify a TypeScript type');
  });

  it('rejects empty excludeFromInsert entries', () => {
    expect(() => validateConfig({ excludeFromInsert: [''] })).toThrow('excludeFromInsert');
  });

  it('rejects empty excludeFromUpdate entries', () => {
    expect(() => validateConfig({ excludeFromUpdate: [' ', 'id'] })).toThrow('excludeFromUpdate');
  });

  it('requires generateTypes when relations enabled', () => {
    expect(() => validateConfig({ generateRelations: true, generateTypes: false })).toThrow('generateRelations');
  });

  it('allows relations when types enabled', () => {
    const config = validateConfig({ generateRelations: true });
    expect(config.generateRelations).toBe(true);
  });

  it('merges overrides with defaults', () => {
    const config = validateConfig({ generateZod: false });
    expect(config.generateZod).toBe(false);
    expect(config.generateTypes).toBe(DEFAULT_CONFIG.generateTypes);
  });
});
