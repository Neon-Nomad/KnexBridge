import { mapDatabaseTypeToTS } from '../../../generator';
import { DEFAULT_CONFIG } from '../../../constants';

describe('mapDatabaseTypeToTS', () => {
  const postgresCases = [
    ['integer', 'number'],
    ['bigint', 'number'],
    ['smallint', 'number'],
    ['numeric', 'number'],
    ['decimal', 'number'],
    ['real', 'number'],
    ['double precision', 'number'],
    ['serial', 'number'],
    ['bigserial', 'number'],
    ['money', 'number'],
    ['character varying', 'string'],
    ['varchar', 'string'],
    ['character', 'string'],
    ['char', 'string'],
    ['text', 'string'],
    ['citext', 'string'],
    ['boolean', 'boolean'],
    ['bool', 'boolean'],
    ['uuid', 'string'],
    ['xml', 'string'],
    ['bytea', 'Buffer'],
  ] as const;

  it.each(postgresCases)('maps PostgreSQL type %s to %s', (dbType, expected) => {
    const { tsType, warning } = mapDatabaseTypeToTS(dbType, {});
    expect(tsType).toBe(expected);
    expect(warning).toBeUndefined();
  });

  const mysqlCases = [
    ['int', 'number'],
    ['tinyint', 'number'],
    ['mediumint', 'number'],
    ['float', 'number'],
    ['double', 'number'],
    ['datetime', 'Date'],
    ['longtext', 'string'],
    ['mediumtext', 'string'],
    ['tinytext', 'string'],
    ['blob', 'Buffer'],
    ['longblob', 'Buffer'],
    ['enum', 'string'],
  ] as const;

  it.each(mysqlCases)('maps MySQL type %s to %s', (dbType, expected) => {
    const { tsType } = mapDatabaseTypeToTS(dbType, {});
    expect(tsType).toBe(expected);
  });

  const sqliteCases = [
    ['INTEGER', 'number'],
    ['REAL', 'number'],
    ['TEXT', 'string'],
    ['BLOB', 'Buffer'],
    ['NUMERIC', 'number'],
  ] as const;

  it.each(sqliteCases)('maps SQLite type %s to %s', (dbType, expected) => {
    const { tsType } = mapDatabaseTypeToTS(dbType, {});
    expect(tsType).toBe(expected);
  });

  describe('date strategy handling', () => {
    const dateType = 'timestamp with time zone';

    it('returns Date by default', () => {
      expect(mapDatabaseTypeToTS(dateType, {}).tsType).toBe('Date');
    });

    it('returns string when configured', () => {
      expect(mapDatabaseTypeToTS(dateType, { dateStrategy: 'string' }).tsType).toBe('string');
    });

    it('returns number when configured', () => {
      expect(mapDatabaseTypeToTS(dateType, { dateStrategy: 'number' }).tsType).toBe('number');
    });
  });

  describe('bigint handling', () => {
    it('returns number by default', () => {
      expect(mapDatabaseTypeToTS('bigint', {}).tsType).toBe('number');
    });

    it('returns bigint when useBigInt is true', () => {
      expect(mapDatabaseTypeToTS('bigint', { useBigInt: true }).tsType).toBe('bigint');
    });
  });

  describe('custom type mappings', () => {
    it('prefers custom mapping over defaults', () => {
      const { tsType } = mapDatabaseTypeToTS('citext', {
        customTypeMappings: { citext: 'CustomType' },
      });
      expect(tsType).toBe('CustomType');
    });

    it('supports custom mapping with mixed case keys', () => {
      const { tsType } = mapDatabaseTypeToTS('Citext', {
        customTypeMappings: { citext: 'AnotherType' },
      });
      expect(tsType).toBe('AnotherType');
    });
  });

  describe('unmapped types', () => {
    it('returns unknown and warning when warnOnUnmappedTypes enabled', () => {
      const { tsType, warning } = mapDatabaseTypeToTS('weird_type', { warnOnUnmappedTypes: true });
      expect(tsType).toBe('unknown');
      expect(warning).toContain('Unmapped database type');
    });

    it('returns unknown without warning when warnOnUnmappedTypes disabled', () => {
      const { tsType, warning } = mapDatabaseTypeToTS('weird_type', { warnOnUnmappedTypes: false });
      expect(tsType).toBe('unknown');
      expect(warning).toBeUndefined();
    });
  });

  describe('case normalization', () => {
    const mixedCases = [
      ['INTEGER', 'number'],
      [' Integer ', 'number'],
      ['VaRChar', 'string'],
      [' TEXT ', 'string'],
      ['Timestamp', 'Date'],
    ] as const;

    it.each(mixedCases)('normalizes %s to %s', (dbType, expected) => {
      expect(mapDatabaseTypeToTS(dbType, {}).tsType).toBe(expected);
    });
  });

  it('falls back to default config when config is empty object', () => {
    const { tsType } = mapDatabaseTypeToTS('timestamp', {});
    expect(tsType).toBe(DEFAULT_CONFIG.dateStrategy);
  });

  it('handles numeric string types gracefully', () => {
    const { tsType } = mapDatabaseTypeToTS('1234', {});
    expect(tsType).toBe('unknown');
  });

  it('handles types with surrounding whitespace and casing', () => {
    const { tsType } = mapDatabaseTypeToTS('  VARCHAR  ', {});
    expect(tsType).toBe('string');
  });

  it('handles JSON type returning unknown', () => {
    const { tsType } = mapDatabaseTypeToTS('jsonb', {});
    expect(tsType).toBe('unknown');
  });

  it('supports mapping custom domain names', () => {
    const { tsType } = mapDatabaseTypeToTS('user_status', {
      customTypeMappings: { user_status: 'UserStatus' },
    });
    expect(tsType).toBe('UserStatus');
  });

  it('warns only when warnOnUnmappedTypes flag present', () => {
    const withoutFlag = mapDatabaseTypeToTS('unhandled', {});
    expect(withoutFlag.warning).toBeUndefined();

    const withFlag = mapDatabaseTypeToTS('unhandled', { warnOnUnmappedTypes: true });
    expect(withFlag.warning).toContain('Unmapped database type');
  });

  it('handles Date strategy overriding default config explicitly', () => {
    const { tsType } = mapDatabaseTypeToTS('date', { dateStrategy: 'Date' });
    expect(tsType).toBe('Date');
  });

  it('supports mapping timestamp without time zone explicitly', () => {
    const { tsType } = mapDatabaseTypeToTS('timestamp without time zone', { dateStrategy: 'string' });
    expect(tsType).toBe('string');
  });

  it('supports mapping timestamptz with numeric strategy', () => {
    const { tsType } = mapDatabaseTypeToTS('timestamptz', { dateStrategy: 'number' });
    expect(tsType).toBe('number');
  });

  it('handles blank type strings', () => {
    const { tsType } = mapDatabaseTypeToTS('   ', {});
    expect(tsType).toBe('unknown');
  });

  it('handles hyphenated type names', () => {
    const { tsType } = mapDatabaseTypeToTS('double precision', {});
    expect(tsType).toBe('number');
  });

  it('handles config with unrelated keys gracefully', () => {
    const { tsType } = mapDatabaseTypeToTS('varchar', { schemaName: 'public' });
    expect(tsType).toBe('string');
  });
});
