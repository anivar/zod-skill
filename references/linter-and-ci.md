# Linting and CI Rules for Zod

Checked against Zod 4.6.7, ESLint 10.14.0 with typescript-eslint 8.72.1, and madge 8.0.0. The knip and ts-prune commands were not run.

## Overview

Mechanical enforcement catches mistakes before code review. Use ESLint rules, CI checks, and static analysis tools to enforce Zod best practices automatically.

## ESLint: `no-restricted-syntax` Rules

ESLint 10 reads only the flat config format, `eslint.config.js`; it no longer supports `.eslintrc`. The config below was run with ESLint 10.14 and typescript-eslint 8.72: it flagged each banned call, skipped `JSON.parse()` and `Date.parse()`, and skipped `config/env.ts`.

```js
// eslint.config.js
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

const zodRules = [
  {
    // parse() throws; JSON.parse, Date.parse and URL.parse are not Zod
    selector: "CallExpression[callee.property.name='parse']:not([callee.object.name=/^(JSON|Date|URL)$/])",
    message: "Use safeParse() instead of parse(). parse() throws on invalid input. See: rules/parse-use-safeParse.md",
  },
  {
    selector: "Property[key.name='reportInput'][value.value=true]",
    message: "reportInput: true leaks sensitive data. Use: reportInput: process.env.NODE_ENV === 'development'. See: rules/error-input-security.md",
  },
  {
    selector: "CallExpression[callee.property.name='nativeEnum']",
    message: "z.nativeEnum() is deprecated. Use z.enum(YourTSEnum). See: rules/migrate-native-enum.md",
  },
  {
    selector: "CallExpression[callee.property.name='email'][callee.object.callee.property.name='string']",
    message: "Use z.email() instead of z.string().email(). See: rules/migrate-string-formats.md",
  },
]

export default defineConfig([
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    rules: { "no-restricted-syntax": ["error", ...zodRules] },
  },
  {
    // crashing on an invalid environment at startup is intended
    files: ["**/config/env.ts", "**/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
])
```

The selectors match syntax, not types. The `parse` rule also flags `.parse()` on other libraries, such as `path.parse()`; extend the exclusion list for the ones your code uses. For type-aware checks, deprecated Zod APIs carry `@deprecated` tags, which `@typescript-eslint/no-deprecated` reports. In the same run, it reported `z.nativeEnum()` and `z.string().email()` with Zod's own replacement text:

```js
// eslint.config.js: type-aware rule; needs a tsconfig.json
{
  files: ["src/**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  plugins: { "@typescript-eslint": tseslint.plugin },
  rules: { "@typescript-eslint/no-deprecated": "error" },
}
```

## CI: Schema Snapshot Regression

Detect unintended schema changes by committing JSON Schema snapshots and failing CI when they drift.

### Setup

```typescript
// scripts/export-schemas.ts
import * as z from "zod"
import { writeFileSync, mkdirSync } from "node:fs"
import { UserSchema, OrderSchema } from "../src/api/schemas"

const schemas = {
  User: UserSchema,
  Order: OrderSchema,
}

mkdirSync("snapshots", { recursive: true })

for (const [name, schema] of Object.entries(schemas)) {
  const jsonSchema = z.toJSONSchema(schema)
  writeFileSync(
    `snapshots/${name}.json`,
    JSON.stringify(jsonSchema, null, 2) + "\n"
  )
}
```

### CI Check

```yaml
# .github/workflows/schema-check.yml
name: Schema Snapshot Check
on: [pull_request]

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsx scripts/export-schemas.ts
      - name: Check for schema drift
        run: |
          if git diff --exit-code snapshots/; then
            echo "Schemas unchanged"
          else
            echo "::error::Schema snapshots have changed. Review the diff and update snapshots if intentional."
            git diff snapshots/
            exit 1
          fi
```

### Workflow

1. Developer changes a schema
2. CI runs `export-schemas.ts` and diffs against committed snapshots
3. If diff exists, CI fails with the exact changes shown
4. Developer reviews the diff, runs `npx tsx scripts/export-schemas.ts` locally, commits updated snapshots

## Unused Schema Detection

Find schemas that are defined but never imported.

### With knip

```bash
npx knip --include exports
```

knip detects unused exports including schemas. Configure in `knip.json`:

```jsonc
{
  "entry": ["src/index.ts"],
  "project": ["src/**/*.ts"],
  "ignore": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### With ts-prune

```bash
npx ts-prune | grep -i schema
```

Shows exported symbols with no imports. Review and remove dead schemas.

## Circular Dependency Detection

Schema modules that import each other can fail at import time: a schema that reads another module's export before that module has run throws a `ReferenceError`. Inside one module, use a getter (see `schema-recursive-types`).

### With madge

```bash
# Find circular dependencies
npx madge --circular --extensions ts src/

# Generate dependency graph
npx madge --image graph.svg --extensions ts src/
```

### CI Integration

```yaml
# madge exits 1 when it finds a cycle, which fails the step
- name: Check circular dependencies
  run: npx madge --circular --extensions ts src/
```

## Custom ESLint Rule Messages

Include remediation instructions in ESLint messages so developers know exactly what to do. Add the entry to `zodRules` above:

```js
{
  selector: "CallExpression[callee.property.name='parse']:not([callee.object.name=/^(JSON|Date|URL)$/])",
  message: "Use safeParse() instead of parse().\n\nparse() throws ZodError on invalid input.\nsafeParse() returns { success, data | error }.\n\nReplace:\n  schema.parse(data)\nWith:\n  const result = schema.safeParse(data)\n  if (!result.success) { /* handle error */ }\n\nSee: rules/parse-use-safeParse.md",
}
```

## Summary

| Tool | What It Catches | When |
|------|----------------|------|
| ESLint `no-restricted-syntax` | Banned API usage (parse, reportInput, nativeEnum) | On save / pre-commit |
| Schema snapshot CI | Unintended schema changes | On pull request |
| knip / ts-prune | Unused schemas | On pull request / periodic |
| madge | Circular schema dependencies | On pull request |
