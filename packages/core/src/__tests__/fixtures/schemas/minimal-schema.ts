import { DatabaseSchema } from '../../../../types';

export const minimalSchema: DatabaseSchema = {
  tables: [
    {
      name: 'users',
      columns: [
        {
          name: 'id',
          type: 'integer',
          nullable: false,
          defaultValue: null,
          maxLength: null,
          precision: null,
          scale: null,
          isPrimaryKey: true,
          isUnique: true,
          comment: 'Primary identifier',
        },
        {
          name: 'email',
          type: 'varchar',
          nullable: false,
          defaultValue: null,
          maxLength: 255,
          precision: null,
          scale: null,
          isPrimaryKey: false,
          isUnique: true,
          comment: 'User email address',
        },
        {
          name: 'created_at',
          type: 'timestamp',
          nullable: false,
          defaultValue: 'now()',
          maxLength: null,
          precision: null,
          scale: null,
          isPrimaryKey: false,
          isUnique: false,
          comment: 'Creation timestamp',
        },
      ],
      foreign_keys: [],
      enums: new Map(),
    },
  ],
};
