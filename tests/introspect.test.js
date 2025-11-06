const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { introspectDatabase } = require('../packages/core/dist/introspect.js');
const { IntrospectionError } = require('../packages/core/dist/errors.js');

test('introspectDatabase rejects when knexfile cannot be loaded', async () => {
  await assert.rejects(
    () => introspectDatabase('non-existent-knexfile.js'),
    error => {
      assert.ok(error instanceof IntrospectionError);
      assert.match(error.message, /Failed to load knexfile/);
      return true;
    }
  );
});

test('introspectDatabase rejects when environment is missing', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knexbridge-'));
  const knexfilePath = path.join(tempDir, 'knexfile.js');

  fs.writeFileSync(
    knexfilePath,
    `module.exports = {
      development: {
        client: 'sqlite3',
        connection: { filename: ':memory:' },
      }
    };`
  );

  try {
    await assert.rejects(
      () => introspectDatabase(knexfilePath, 'production'),
      error => {
        assert.ok(error instanceof IntrospectionError);
        assert.match(error.message, /Environment "production" not found/);
        return true;
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
