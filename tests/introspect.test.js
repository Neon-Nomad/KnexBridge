const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { IntrospectionError } = require('../packages/core/dist/errors.js');

const introspectModulePath = path.resolve(__dirname, '../packages/core/dist/introspect.js');
const knexModulePath = require.resolve('knex');

function requireFreshIntrospect() {
  delete require.cache[introspectModulePath];
  return require(introspectModulePath);
}

function createSqliteKnexStub() {
  const state = { destroyed: false, rawCalls: [] };
  const tableRows = [
    { name: 'posts' },
    { name: 'users' },
  ];

  const builders = {
    sqlite_master: {
      select() {
        return this;
      },
      where() {
        return this;
      },
      andWhere() {
        return this;
      },
      orderBy() {
        // The production code awaits the result of orderBy, so we resolve here.
        return Promise.resolve(tableRows);
      },
    },
  };

  const columnsByTable = {
    users: [
      { name: 'id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 1 },
      { name: 'email', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
    ],
    posts: [
      { name: 'id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 1 },
      { name: 'user_id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 0 },
      { name: 'title', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
    ],
  };

  const foreignKeysByTable = {
    posts: [
      {
        id: 0,
        seq: 0,
        table: 'users',
        from: 'user_id',
        to: 'id',
        on_update: 'NO ACTION',
        on_delete: 'CASCADE',
      },
    ],
  };

  const stub = function knex(tableName) {
    if (builders[tableName]) {
      return builders[tableName];
    }
    throw new Error(`Unexpected table access: ${tableName}`);
  };

  stub.raw = async sql => {
    state.rawCalls.push(sql);
    const matchTableInfo = /PRAGMA\s+table_info\("(?<table>[^"]+)"\)/i.exec(sql);
    if (matchTableInfo) {
      const tableName = matchTableInfo.groups.table;
      return columnsByTable[tableName] || [];
    }

    const matchForeignKey = /PRAGMA\s+foreign_key_list\("(?<table>[^"]+)"\)/i.exec(sql);
    if (matchForeignKey) {
      const tableName = matchForeignKey.groups.table;
      return foreignKeysByTable[tableName] || [];
    }

    return [];
  };

  stub.destroy = async () => {
    state.destroyed = true;
  };

  stub.state = state;

  return stub;
}

function createPostgresKnexStub() {
  const state = { rawCalls: [], destroyed: false };

  const columnsRows = [
    {
      table_name: 'users',
      column_name: 'id',
      data_type: 'integer',
      is_nullable: 'NO',
      column_default: "nextval('users_id_seq'::regclass)",
      character_maximum_length: null,
      numeric_precision: 32,
      numeric_scale: 0,
      is_primary_key: true,
      is_unique: true,
      comment: 'Primary key',
    },
    {
      table_name: 'users',
      column_name: 'email',
      data_type: 'character varying',
      is_nullable: 'NO',
      column_default: null,
      character_maximum_length: 255,
      numeric_precision: null,
      numeric_scale: null,
      is_primary_key: false,
      is_unique: true,
      comment: 'User email',
    },
  ];

  const foreignKeyRows = [
    {
      table_name: 'posts',
      column_name: 'user_id',
      foreign_table_name: 'users',
      foreign_column_name: 'id',
      on_update: 'NO ACTION',
      on_delete: 'CASCADE',
    },
  ];

  const enumRows = [
    { enum_name: 'status_enum', enum_value: 'ACTIVE' },
    { enum_name: 'status_enum', enum_value: 'INACTIVE' },
  ];

  const stub = () => {
    throw new Error('Unexpected builder usage in Postgres stub');
  };

  stub.raw = async sql => {
    state.rawCalls.push(sql);
    if (/information_schema\.columns/i.test(sql)) {
      return { rows: columnsRows };
    }
    if (/referential_constraints/i.test(sql)) {
      return { rows: foreignKeyRows };
    }
    if (/pg_enum/i.test(sql)) {
      return { rows: enumRows };
    }
    throw new Error(`Unexpected SQL for Postgres stub: ${sql}`);
  };

  stub.destroy = async () => {
    state.destroyed = true;
  };

  stub.state = state;

  return stub;
}

function createMySqlKnexStub() {
  const state = { rawCalls: [], destroyed: false };

  const columnRows = [
    {
      table_name: 'users',
      column_name: 'id',
      data_type: 'int',
      is_nullable: 'NO',
      column_default: null,
      character_maximum_length: null,
      numeric_precision: 11,
      numeric_scale: 0,
      is_primary_key: 1,
      is_unique: 1,
      comment: 'Primary key',
      column_type: 'int(11)',
    },
    {
      table_name: 'users',
      column_name: 'status',
      data_type: 'enum',
      is_nullable: 'NO',
      column_default: 'draft',
      character_maximum_length: null,
      numeric_precision: null,
      numeric_scale: null,
      is_primary_key: 0,
      is_unique: 0,
      comment: 'Account status',
      column_type: "enum('draft','active')",
    },
  ];

  const foreignKeyRows = [
    {
      table_name: 'posts',
      column_name: 'user_id',
      foreign_table_name: 'users',
      foreign_column_name: 'id',
      on_update: 'NO ACTION',
      on_delete: 'CASCADE',
    },
  ];

  const stub = () => {
    throw new Error('Unexpected builder usage in MySQL stub');
  };

  stub.raw = async sql => {
    state.rawCalls.push(sql);
    if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) {
      return [columnRows];
    }
    if (/INFORMATION_SCHEMA\.KEY_COLUMN_USAGE/i.test(sql)) {
      return [foreignKeyRows];
    }
    return [[]];
  };

  stub.destroy = async () => {
    state.destroyed = true;
  };

  stub.state = state;

  return stub;
}
test('introspectDatabase rejects when knexfile cannot be loaded', async () => {
  const { introspectDatabase } = requireFreshIntrospect();

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
  const { introspectDatabase } = requireFreshIntrospect();
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

  delete require.cache[require.resolve(knexfilePath)];

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
    delete require.cache[require.resolve(knexfilePath)];
  }
});

test('introspectDatabase returns SQLite schema details when knex succeeds', async () => {
  const originalKnexModule = require.cache[knexModulePath];
  let stubInstance;

  const stubFactory = config => {
    stubInstance = createSqliteKnexStub();
    stubInstance.receivedConfig = config;
    return stubInstance;
  };

  require.cache[knexModulePath] = { exports: stubFactory };
  const { introspectDatabase } = requireFreshIntrospect();
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

  delete require.cache[require.resolve(knexfilePath)];

  try {
    const result = await introspectDatabase(knexfilePath, 'development', {
      excludeTables: ['posts'],
    });

    assert.equal(result.tables.length, 1);
    const [usersTable] = result.tables;
    assert.equal(usersTable.name, 'users');
    assert.equal(usersTable.columns.length, 2);

    assert.equal(stubInstance.receivedConfig.client, 'sqlite3');

    const idColumn = usersTable.columns.find(col => col.name === 'id');
    assert.ok(idColumn);
    assert.equal(idColumn.isPrimaryKey, true);

    const emailColumn = usersTable.columns.find(col => col.name === 'email');
    assert.ok(emailColumn);
    assert.equal(emailColumn.type, 'TEXT');
    assert.equal(emailColumn.nullable, false);

    assert.deepEqual(usersTable.foreign_keys, []);

    assert.ok(stubInstance.state.destroyed, 'knex.destroy should be awaited');
    assert.ok(
      stubInstance.state.rawCalls.some(sql => /table_info\("users"\)/.test(sql)),
      'introspector should query PRAGMA table_info'
    );
  } finally {
    if (originalKnexModule) {
      require.cache[knexModulePath] = originalKnexModule;
    } else {
      delete require.cache[knexModulePath];
    }
    delete require.cache[introspectModulePath];
    delete require.cache[require.resolve(knexfilePath)];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});



test('introspectDatabase merges PostgreSQL schema details correctly', async () => {
  const originalKnexModule = require.cache[knexModulePath];
  const stubFactory = () => createPostgresKnexStub();

  require.cache[knexModulePath] = { exports: stubFactory };
  const { introspectDatabase } = requireFreshIntrospect();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knexbridge-pg-'));
  const knexfilePath = path.join(tempDir, 'knexfile.js');

  fs.writeFileSync(
    knexfilePath,
    `module.exports = {
      development: {
        client: 'pg',
        connection: {}
      }
    };`
  );

  delete require.cache[require.resolve(knexfilePath)];

  try {
    const result = await introspectDatabase(knexfilePath, 'development', {
      schemaName: 'public',
    });

    assert.equal(result.tables.length, 1);

    const usersTable = result.tables.find(table => table.name === 'users');
    assert.ok(usersTable, 'users table should be present');
    assert.equal(usersTable.columns.length, 2);

    const idColumn = usersTable.columns.find(col => col.name === 'id');
    assert.ok(idColumn);
    assert.equal(idColumn.isPrimaryKey, true);
    assert.equal(idColumn.comment, 'Primary key');

    const emailColumn = usersTable.columns.find(col => col.name === 'email');
    assert.ok(emailColumn);
    assert.equal(emailColumn.isUnique, true);

    assert.ok(usersTable.enums instanceof Map);
    assert.deepEqual(usersTable.enums.get('status_enum'), ['ACTIVE', 'INACTIVE']);
  } finally {
    if (originalKnexModule) {
      require.cache[knexModulePath] = originalKnexModule;
    } else {
      delete require.cache[knexModulePath];
    }
    delete require.cache[introspectModulePath];
    delete require.cache[require.resolve(knexfilePath)];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});


test('introspectDatabase merges MySQL schema details correctly', async () => {
  const originalKnexModule = require.cache[knexModulePath];
  const stubFactory = () => createMySqlKnexStub();

  require.cache[knexModulePath] = { exports: stubFactory };
  const { introspectDatabase } = requireFreshIntrospect();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knexbridge-mysql-'));
  const knexfilePath = path.join(tempDir, 'knexfile.js');

  fs.writeFileSync(
    knexfilePath,
    `module.exports = {
      development: {
        client: 'mysql',
        connection: {}
      }
    };`
  );

  delete require.cache[require.resolve(knexfilePath)];

  try {
    const result = await introspectDatabase(knexfilePath, 'development', {
      schemaName: 'public',
    });

    const usersTable = result.tables.find(table => table.name === 'users');
    assert.ok(usersTable);
    assert.equal(usersTable.columns.length, 2);

    const idColumn = usersTable.columns.find(col => col.name === 'id');
    assert.ok(idColumn);
    assert.equal(idColumn.isPrimaryKey, true);

    const statusColumn = usersTable.columns.find(col => col.name === 'status');
    assert.ok(statusColumn);
    assert.equal(statusColumn.nullable, false);

    assert.ok(usersTable.enums instanceof Map);
    assert.deepEqual(usersTable.enums.get('users_status'), ['draft', 'active']);
  } finally {
    if (originalKnexModule) {
      require.cache[knexModulePath] = originalKnexModule;
    } else {
      delete require.cache[knexModulePath];
    }
    delete require.cache[introspectModulePath];
    delete require.cache[require.resolve(knexfilePath)];
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});




