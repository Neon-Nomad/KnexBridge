<p align="center">
  <img src="./images/32457535-f911-4ba2-9579-4818e7eedc27.png" alt="KnexBridge Logo" width="500">
</p>

<h3 align="center">Generate Types. Validate Everything.</h3>

---

## Overview

**KnexBridge** is an open-source TypeScript toolchain that bridges your database and codebase.  
It introspects your Knex database and automatically generates:

- Strongly typed TypeScript interfaces  
- Validation-ready Zod schemas  
- Typed Insert and Update variants  
- A CLI that integrates seamlessly into your workflow  

---

## How It Works

<p align="center">
  <img src="./images/b3c897bd-d4e0-44f6-9754-5dd6930eb66d.png" alt="KnexBridge Workflow" width="650">
</p>

KnexBridge connects your **database schema** to your **TypeScript application**, generating the types and schemas you need for consistent, type-safe development.

```bash
npx knexbridge generate --config knexfile.js --out ./generated

Features

Full Database Introspection
Reads your schema and relationships (SQLite supported; Postgres/MySQL/MSSQL planned).

TypeScript Code Generation
Generates interfaces with Insert, Update, and relational variants.

Zod Schema Output
Produces runtime validation schemas for APIs, forms, and data modeling.

Flexible Naming Strategies
Supports pascal, camel, snake, or preserve.

Custom Type Mappings
Override or extend SQL-to-TypeScript and SQL-to-Zod conversions.

CLI-First Workflow
One command handles introspection and generation.


## Repository Structure

knexbridge/
├── .eslintrc.json
├── .prettierrc
├── .nvmrc
├── LICENSE
├── README.md
├── package.json
├── tsconfig.base.json
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── analyzer.ts
    │       ├── constants.ts
    │       ├── errors.ts
    │       ├── generator.ts
    │       ├── index.ts
    │       ├── introspect.ts
    │       ├── map-types.ts
    │       ├── naming.ts
    │       ├── types.ts
    │       └── utils.ts
    └── cli/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── commands/
            │   └── generate.ts
            └── utils/
                ├── config.ts
                └── logger.ts

## Quick Start

# Install dependencies
npm install

# Build all packages
npm run build

# Run the CLI
npx knexbridge generate --config knexfile.js --out ./generated

## Example Output

From this schema:

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


KnexBridge generates:

export interface User {
  id: number;
  username: string;
  email?: string | null;
  created_at: string;
}

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  created_at: z.string(),
});

## Configuration

KnexBridge supports .knexbridgerc, knexbridge.config.json, or direct CLI flags.

Example configuration:

{
  "generateTypes": true,
  "generateZod": true,
  "generateInsertTypes": true,
  "generateUpdateTypes": true,
  "namingStrategy": "pascal",
  "tableNameFormat": "singular",
  "dateStrategy": "string",
  "useBigInt": true
}

## Development
# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck

## License

This project is licensed under the MIT License.
See the LICENSE
 file for details.

<p align="center"> <img src="./images/5cb385b3-b716-45e2-ab10-4f5a1c278b5c.png" alt="KnexBridge Banner" width="600"> </p> ```


