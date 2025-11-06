const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { generate } = require('../packages/core/dist/generate.js');
const { DEFAULT_CONFIG } = require('../packages/core/dist/constants.js');

const schema = {
  tables: [
    {
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
          name: 'display_name',
          type: 'text',
          nullable: true,
          isPrimaryKey: false,
          isUnique: false,
          comment: 'Shown on profile pages',
        },
      ],
      foreign_keys: [],
    },
  ],
};

test('generate writes schema, validation, and index files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knexbridge-'));

  try {
    const result = generate(schema, tempDir, {
      ...DEFAULT_CONFIG,
      outDir: tempDir,
      generateTypes: true,
      generateZod: true,
      generateRelations: false,
    });

    const schemaPath = path.join(tempDir, 'bridge.schema.ts');
    const validationPath = path.join(tempDir, 'bridge.validation.ts');
    const indexPath = path.join(tempDir, 'index.ts');

    assert.ok(fs.existsSync(schemaPath));
    assert.ok(fs.existsSync(validationPath));
    assert.ok(fs.existsSync(indexPath));
    assert.equal(result.filesGenerated.length, 3);
    assert.equal(result.tablesProcessed, 1);

    const schemaContents = fs.readFileSync(schemaPath, 'utf8');
    assert.match(schemaContents, /export interface user/);
    assert.match(schemaContents, /displayName\?: string/);

    const validationContents = fs.readFileSync(validationPath, 'utf8');
    assert.match(validationContents, /export const userSchema/);
    assert.match(validationContents, /displayName: z\.string\(\)\.nullable\(\)/);

    const indexContents = fs.readFileSync(indexPath, 'utf8');
    assert.match(indexContents, /export \* from '\.\/bridge\.schema'/);
    assert.match(indexContents, /export \* from '\.\/bridge\.validation'/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
