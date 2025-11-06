import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generate } from '../../../generate';
import { realisticSchema } from '../fixtures/schemas/realistic-schema';
import { validateConfig } from '../../../config';
import * as ts from 'typescript';
import { z } from 'zod';

describe('Full generation E2E', () => {
  let outDir: string;
  let result: ReturnType<typeof generate>;
  let validationModule: any;

  beforeAll(() => {
    outDir = mkdtempSync(join(tmpdir(), 'knexbridge-e2e-'));
    result = generate(realisticSchema, outDir, validateConfig({
      namingStrategy: 'pascal',
      tableNameFormat: 'singular',
      generateRelations: true,
    }));

    const validationContent = readFileSync(join(outDir, 'bridge.validation.ts'), 'utf8');
    const transpiled = ts.transpileModule(validationContent, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    const moduleExports: any = {};
    // eslint-disable-next-line no-new-func
    const evaluator = new Function('module', 'exports', 'require', transpiled.outputText);
    evaluator({ exports: moduleExports }, moduleExports, require);
    validationModule = moduleExports;
  });

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('generates bridge.schema.ts file', () => {
    expect(existsSync(join(outDir, 'bridge.schema.ts'))).toBe(true);
  });

  it('generates bridge.validation.ts file', () => {
    expect(existsSync(join(outDir, 'bridge.validation.ts'))).toBe(true);
  });

  it('generates index.ts file', () => {
    expect(existsSync(join(outDir, 'index.ts'))).toBe(true);
  });

  it('returns metrics with table count', () => {
    expect(result.tablesProcessed).toBe(realisticSchema.tables.length);
    expect(result.metrics.filesWritten).toBe(3);
  });

  it('writes interface definitions', () => {
    const content = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    expect(content).toContain('export interface User');
    expect(content).toContain('export interface Profile');
  });

  it('includes relation interfaces', () => {
    const content = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    expect(content).toContain('export interface UserRelations');
    expect(content).toContain('export interface ProfileRelations');
  });

  it('includes insert and update types', () => {
    const content = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    expect(content).toContain('type UserInsert');
    expect(content).toContain('type UserUpdate');
  });

  it('exports modules via index file', () => {
    const content = readFileSync(join(outDir, 'index.ts'), 'utf8');
    expect(content).toContain("export * from './bridge.schema'");
    expect(content).toContain("export * from './bridge.validation'");
  });

  it('transpiles generated TypeScript without diagnostics', () => {
    const schemaContent = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    const transpiled = ts.transpileModule(schemaContent, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 },
      reportDiagnostics: true,
    });
    expect(transpiled.diagnostics?.length ?? 0).toBe(0);
  });

  it('validates data using generated Zod schemas', () => {
    const schema = validationModule.UserSchema as z.ZodTypeAny;
    const parsed = schema.parse({
      id: 1,
      username: 'user',
      email: 'user@example.com',
      createdAt: new Date(),
    });
    expect(parsed.username).toBe('user');
  });

  it('rejects invalid data using generated Zod schemas', () => {
    const schema = validationModule.UserSchema as z.ZodTypeAny;
    expect(() =>
      schema.parse({
        id: 'invalid',
        username: 123,
        email: null,
        createdAt: 'not-a-date',
      }),
    ).toThrow();
  });

  it('records warnings array even when empty', () => {
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('supports custom configuration merges', () => {
    const customResult = generate(realisticSchema, outDir, {
      generateZod: false,
      generateInsertTypes: false,
      generateUpdateTypes: false,
    });
    expect(customResult.filesGenerated).toContain(join(outDir, 'bridge.schema.ts'));
  });

  it('produces deterministic output between runs', () => {
    const first = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    const secondResult = generate(realisticSchema, outDir, validateConfig());
    const second = readFileSync(join(outDir, 'bridge.schema.ts'), 'utf8');
    expect(first).toBe(second);
    expect(secondResult.tablesProcessed).toBe(realisticSchema.tables.length);
  });
});
