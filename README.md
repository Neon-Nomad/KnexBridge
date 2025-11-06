# KnexBridge

## Generate Types. Validate Everything.

![KnexBridge Hero](./images/readme1.png)

KnexBridge bridges relational databases and TypeScript applications by introspecting your schema, generating fully typed models, and producing runtime validation assets. It is designed for teams that rely on Knex.js for migrations and queries but want stronger guarantees across API layers, services, and front-end clients.

![KnexBridge Architecture](./images/readme3.png)
![KnexBridge Code Example](./images/readme2.png)

## Introduction
KnexBridge automates the path from database schema to application code. By combining schema introspection, naming strategies, and template-driven code generation, it delivers TypeScript interfaces, insert/update helpers, and Zod validators that stay accurate with every migration. Engineers, data teams, and API builders who work with Knex.js can integrate it into CI pipelines or run it on demand from the CLI.

## Features
- Database introspection for SQLite today, with PostgreSQL, MySQL, and SQL Server on the roadmap.
- TypeScript interface generation with configurable naming strategies and relation helpers.
- Automatic Zod schema creation for request validation and shared contracts.
- Insert and update helper types that respect excluded columns and defaults.
- Customizable type mappings and surfacing of warnings for unmapped columns.
- CLI workflow with progress reporting, metrics, and optional configuration files.

## Installation
`ash
npm install --save-dev @knexbridge/cli
`

## Quick Start
1. Create a knexfile.js describing your Knex environments:
`javascript
/** @type {import('knex').Knex.Config} */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite',
    },
    useNullAsDefault: true,
  },
};
`
2. Generate code into a target folder:
`ash
npx knexbridge generate --config ./knexfile.js --env development --out ./generated
`
3. Import the generated modules from your application:
`	ypescript
import { bridge } from './generated';
`

## Example Output
`	ypescript
// generated/bridge.schema.ts
export interface User {
  id: number;
  username: string;
  email?: string | null;
  createdAt: Date;
}

export type UserInsert = Pick<User, 'username' | 'email'>;
export type UserUpdate = Partial<Pick<User, 'username' | 'email'>>;
`
`	ypescript
// generated/bridge.validation.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  username: z.string().min(1),
  email: z.string().email().nullable(),
  createdAt: z.date(),
});
`

## Development
`ash
npm install
npm run build
npm run test
`
- 
pm run build compiles the core and CLI packages.
- 
pm run test performs type-level smoke tests across the workspace.

## Roadmap
- Add PostgreSQL, MySQL, and SQL Server dialect support with driver autodetection.
- Generate relation-aware helper functions and query builders.
- Provide plugin hooks for custom template outputs (tRPC, OpenAPI, etc.).
- Publish official VS Code snippets and typed SDK examples.

## Contributing
Contributions are welcome. Open an issue to discuss ideas or submit a pull request with tests and documentation updates.

## License
Licensed under the [MIT License](./LICENSE).

![KnexBridge Footer](./images/readme4.png)
