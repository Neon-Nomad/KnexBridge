import { Knex } from 'knex';

export async function setupTestSchema(db: Knex): Promise<void> {
  await db.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('name');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  await db.schema.createTable('posts', table => {
    table.increments('id').primary();
    table.integer('user_id').references('users.id');
    table.string('title').notNullable();
    table.text('body');
    table.timestamp('published_at');
  });
}

export async function teardownTestSchema(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists('posts');
  await db.schema.dropTableIfExists('users');
}

export async function seedTestData(db: Knex): Promise<void> {
  await db('users').insert([
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
  ]);

  await db('posts').insert([
    { user_id: 1, title: 'Hello World', body: 'First post' },
    { user_id: 2, title: 'Another Post', body: 'Second post' },
  ]);
}
