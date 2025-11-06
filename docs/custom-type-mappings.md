# Resolving MAX_WARNINGS / Unmapped Type Warnings

KnexBridge highlights any database columns it cannot confidently map to a TypeScript or Zod type. Rather than ignoring these warnings, add an explicit mapping so that the generator produces stable contracts.

## Quick Recipe

1. Find the warning printed after generation, e.g.
   ```
   WARNING  accounts.meta_json: Unmapped database type "jsonb" - defaulting to "unknown"
   ```
2. Add a `customTypeMappings` entry in your configuration:
   ```json
   {
     "customTypeMappings": {
       "jsonb": "unknown"
     }
   }
   ```
3. Re-run `npx knexbridge generate` — the warning disappears and every future run stays consistent.

## Advanced Tips
- Map PostgreSQL array types to your preferred representation (e.g. `text[]` ? `string[]`).
- Provide Zod equivalents by post-processing the generated file or extending the generator.
- Keep mappings in source control to document intentional deviations from defaults.

By closing every warning you create a “zero drift” contract between the database and your application code.
