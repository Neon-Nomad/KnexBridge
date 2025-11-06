import {
  generateTypeInterface,
  generateZodSchema,
  generateInsertUpdateTypes,
  generateRelationTypes,
} from '../../../generator';
import { createMockTable, createMockColumn, normalizeCode, mergeConfig } from '../test/helpers';
import { userInterface } from '../fixtures/expected-outputs/user-interface';
import { minimalSchema } from '../fixtures/schemas/minimal-schema';
import { DEFAULT_CONFIG } from '../../../constants';

describe('generator module', () => {
  describe('generateTypeInterface', () => {
    it('generates TypeScript interface for table', () => {
      const table = createMockTable({
        name: 'users',
        columns: [
          createMockColumn({ name: 'id', type: 'integer', comment: 'Primary identifier' }),
          createMockColumn({ name: 'email', type: 'varchar', nullable: false, comment: 'User email address' }),
          createMockColumn({ name: 'created_at', type: 'timestamp', nullable: false, comment: 'Creation timestamp' }),
        ],
      });

      const { code } = generateTypeInterface(table, mergeConfig());
      expect(normalizeCode(code)).toBe(normalizeCode(userInterface));
    });

    it('marks nullable columns optional', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id', nullable: false }),
          createMockColumn({ name: 'nickname', nullable: true }),
        ],
      });

      const { code } = generateTypeInterface(table, mergeConfig());
      expect(code).toContain('nickname?:');
      expect(code).toContain('id:');
    });

    it('collects warnings for unmapped types when configured', () => {
      const table = createMockTable({
        columns: [createMockColumn({ name: 'mystery', type: 'unknown_type' })],
      });

      const { warnings } = generateTypeInterface(table, mergeConfig({ warnOnUnmappedTypes: true }));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('mystery');
    });

    it('omits warnings when warnOnUnmappedTypes disabled', () => {
      const table = createMockTable({
        columns: [createMockColumn({ name: 'mystery', type: 'unknown_type' })],
      });

      const { warnings } = generateTypeInterface(table, mergeConfig({ warnOnUnmappedTypes: false }));
      expect(warnings).toHaveLength(0);
    });

    it('respects naming strategy', () => {
      const table = createMockTable({ name: 'user_profiles', columns: [createMockColumn({ name: 'created_at' })] });
      const { code } = generateTypeInterface(table, mergeConfig({ namingStrategy: 'pascal' }));
      expect(code).toContain('export interface UserProfile');
      expect(code).toContain('createdAt:');
    });

    it('respects table name format singularization', () => {
      const table = createMockTable({ name: 'people' });
      const { code } = generateTypeInterface(table, mergeConfig({ tableNameFormat: 'plural' }));
      expect(code).toContain('export interface Peoples');
    });

    it('includes column comments', () => {
      const table = createMockTable({
        columns: [createMockColumn({ name: 'id', comment: 'Primary key comment' })],
      });
      const { code } = generateTypeInterface(table, mergeConfig());
      expect(code).toContain('/** Primary key comment */');
    });

    it('handles empty columns array gracefully', () => {
      const table = createMockTable({ columns: [] });
      const { code } = generateTypeInterface(table, mergeConfig());
      expect(code.trim()).toBe('export interface Users {\n}');
    });
  });

  describe('generateZodSchema', () => {
    it('generates schema with correct validators', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'email', type: 'varchar', nullable: false }),
          createMockColumn({ name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()' }),
        ],
      });

      const { code } = generateZodSchema(table, mergeConfig());
      expect(code).toContain("z.string()");
      expect(code).toContain("z.date().nullable().optional()");
    });

    it('collects warnings for unmapped types when enabled', () => {
      const table = createMockTable({
        columns: [createMockColumn({ name: 'mystery', type: 'weird' })],
      });

      const { warnings } = generateZodSchema(table, mergeConfig({ warnOnUnmappedTypes: true }));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('mystery');
    });

    it('skips warnings when disabled', () => {
      const table = createMockTable({ columns: [createMockColumn({ name: 'mystery', type: 'weird' })] });
      const { warnings } = generateZodSchema(table, mergeConfig({ warnOnUnmappedTypes: false }));
      expect(warnings).toHaveLength(0);
    });

    it('applies naming strategy for schema name', () => {
      const table = createMockTable({ name: 'user_profiles' });
      const { code } = generateZodSchema(table, mergeConfig({ namingStrategy: 'pascal' }));
      expect(code).toContain('export const UserProfileSchema');
    });

    it('handles tables without columns', () => {
      const table = createMockTable({ columns: [] });
      const { code } = generateZodSchema(table, mergeConfig());
      expect(code.trim()).toBe("export const UsersSchema = z.object({\n});");
    });
  });

  describe('generateInsertUpdateTypes', () => {
    it('generates insert type excluding default fields', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'email', nullable: false }),
          createMockColumn({ name: 'created_at' }),
          createMockColumn({ name: 'updated_at' }),
        ],
      });

      const code = generateInsertUpdateTypes(table, mergeConfig());
      expect(code).toContain("export type UsersInsert = Pick<Users, 'email'>;");
    });

    it('generates update type as partial excluding configured fields', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'email', nullable: false }),
          createMockColumn({ name: 'updated_at' }),
        ],
      });

      const code = generateInsertUpdateTypes(table, mergeConfig());
      expect(code).toContain("export type UsersUpdate = Partial<Pick<Users, 'email'>>;");
    });

    it('respects custom exclusion configuration', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'email', nullable: false }),
          createMockColumn({ name: 'last_login' }),
        ],
      });

      const code = generateInsertUpdateTypes(
        table,
        mergeConfig({
          excludeFromInsert: ['id'],
          excludeFromUpdate: ['id', 'last_login'],
        }),
      );

      expect(code).toContain("Pick<Users, 'email' | 'lastLogin'>");
      expect(code).toContain("Partial<Pick<Users, 'email'>>");
    });

    it('respects disabled insert type generation', () => {
      const table = createMockTable({ columns: [createMockColumn({ name: 'email' })] });
      const code = generateInsertUpdateTypes(table, mergeConfig({ generateInsertTypes: false }));
      expect(code).not.toContain('Insert');
    });

    it('respects disabled update type generation', () => {
      const table = createMockTable({ columns: [createMockColumn({ name: 'email' })] });
      const code = generateInsertUpdateTypes(table, mergeConfig({ generateUpdateTypes: false }));
      expect(code).not.toContain('Update');
    });
  });

  describe('generateRelationTypes', () => {
    it('returns empty string when relations disabled', () => {
      const table = createMockTable({
        foreign_keys: [
          { columnName: 'user_id', foreignTableName: 'users', foreignColumnName: 'id' },
        ],
      });

      const code = generateRelationTypes(table, minimalSchema.tables, mergeConfig({ generateRelations: false }));
      expect(code).toBe('');
    });

    it('returns empty string when no foreign keys', () => {
      const table = createMockTable({ foreign_keys: [] });
      const code = generateRelationTypes(table, minimalSchema.tables, mergeConfig());
      expect(code).toBe('');
    });

    it('generates relation interface with converted field names', () => {
      const table = createMockTable({
        foreign_keys: [
          { columnName: 'profile_id', foreignTableName: 'profiles', foreignColumnName: 'id' },
        ],
      });

      const code = generateRelationTypes(table, minimalSchema.tables, mergeConfig());
      expect(code).toContain('export interface UsersRelations extends Users');
      expect(code).toContain('profile?: Profiles');
    });

    it('singularizes relation field names by stripping _id suffix', () => {
      const table = createMockTable({
        foreign_keys: [
          { columnName: 'author_id', foreignTableName: 'users', foreignColumnName: 'id' },
        ],
      });

      const code = generateRelationTypes(table, minimalSchema.tables, mergeConfig({ namingStrategy: 'camel' }));
      expect(code).toContain('author?: Users');
    });
  });

  describe('configuration defaults', () => {
    it('mergeConfig falls back to DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG.generateTypes).toBe(true);
    });

    it('allows overriding naming strategy while keeping defaults', () => {
      const config = mergeConfig({ namingStrategy: 'snake' });
      expect(config.namingStrategy).toBe('snake');
      expect(config.generateTypes).toBe(true);
    });
  });
});
