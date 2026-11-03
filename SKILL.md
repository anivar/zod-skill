---
name: zod
description: >
  Zod v4 best practices, patterns, and API guidance for schema validation,
  parsing, error handling, and type inference in TypeScript applications.
  Covers safeParse, object composition, refinements, transforms, codecs,
  branded types, v3→v4 migration, and testing schemas with Jest or Vitest.
  Baseline: zod ^4.6.0.
  Triggers on: zod imports, z.object, z.string, z.infer, safeParse,
  mentions of "zod", "schema validation", "zod v4", "z.enum", or testing a
  schema — "schema test", "zod mock", zod-schema-faker.
license: MIT
user-invocable: false
agentic: false
compatibility: "TypeScript ^5.5 projects using zod ^4.6.0 or later (checked against zod 4.6.7)"
metadata:
  author: Anivar Aravind
  author_url: https://anivar.net
  version: 2.0.0
  tags: zod, validation, schema, typescript, parsing, type-inference, forms, api, testing, jest, vitest
---

# Zod

**IMPORTANT:** Your training data about `zod` may be outdated or incorrect — Zod 4 changes string formats, enums, error customization, issue codes, defaults, and functions. Always rely on this skill's rule files and the project's actual source code as the source of truth. Do not fall back on memorized v3 patterns when they conflict with the retrieved reference.

## When to Use Zod

Zod is for **runtime type validation** — parsing untrusted data at system boundaries (API input, form data, env vars, external services). For compile-time-only types, plain TypeScript is sufficient.

| Need | Recommended Tool |
|------|-----------------|
| API input/output validation | **Zod** |
| Form validation (React, Vue) | **Zod** (with react-hook-form, formik, etc.) |
| Env var parsing | **Zod** (with t3-env or manual) |
| Compile-time types only | Plain TypeScript |
| Strict client bundle budget | Zod Mini (`zod/mini`), or Valibot |
| Maximum type inference | ArkType |

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Parsing & Type Safety | CRITICAL | `parse-` |
| 2 | Schema Design | CRITICAL | `schema-` |
| 3 | Refinements & Transforms | HIGH | `refine-` |
| 4 | Error Handling | HIGH | `error-` |
| 5 | Performance & Composition | MEDIUM | `perf-` |
| 6 | v4 Migration | MEDIUM | `migrate-` |
| 7 | Advanced Patterns | MEDIUM | `pattern-` |
| 8 | Architecture & Boundaries | CRITICAL/HIGH | `arch-` |
| 9 | Observability | HIGH/MEDIUM | `observe-` |

## Quick Reference

### 1. Parsing & Type Safety (CRITICAL)

- `parse-use-safeParse` — Use `safeParse()` for user input instead of `parse()` which throws
- `parse-async-required` — Must use `parseAsync()`/`safeParseAsync()` when schema has async refinements
- `parse-infer-types` — Use `z.infer<typeof Schema>` for output types; never manually duplicate types
- `parse-validate-boolean` — Use `.validate()` for a yes or no; it narrows to the input type, so use `safeParse()` for the output

### 2. Schema Design (CRITICAL)

- `schema-object-unknowns` — `z.object()` strips unknown keys; use `strictObject` or `looseObject`
- `schema-union-discriminated` — Use `z.discriminatedUnion()` for tagged unions, not `z.union()`
- `schema-coercion-pitfalls` — `z.coerce.boolean()` makes `"false"` → `true`; use `z.stringbool()`
- `schema-recursive-types` — Use a getter for recursive schemas; cyclic input parses since 4.5
- `schema-json-string` — `z.json()` does not parse a string; decode JSON text with a codec

### 3. Refinements & Transforms (HIGH)

- `refine-never-throw` — Never throw inside `.refine()` or `.transform()`; return false, or add issues through `ctx`
- `refine-vs-transform` — `.refine()` for validation, `.transform()` for conversion, `.pipe()` for staging
- `refine-cross-field` — Refine the parent object and set `path`; `.superRefine()` for several issues

### 4. Error Handling (HIGH)

- `error-custom-messages` — Use the `error` parameter; `required_error`/`invalid_type_error` are gone, `message` is deprecated
- `error-formatting` — `z.flattenError()` for forms, `z.treeifyError()` for nested; `formatError` deprecated
- `error-input-security` — Never use `reportInput: true` in production; leaks sensitive data

### 5. Performance & Composition (MEDIUM)

- `perf-extend-spread` — Use `{ ...Schema.shape }` spread over chained `.extend()` for large schemas
- `perf-reuse-schemas` — Define once, derive with `.pick()`, `.omit()`, `.partial()`
- `perf-zod-mini` — Use Zod Mini (`zod/mini`) only under a strict client bundle budget; load a locale
- `perf-compile` — Compile the final schema with `z.compile()`; prove it compiled with `strict: true` in a test

### 6. v4 Migration (MEDIUM)

- `migrate-string-formats` — Use `z.email()`, `z.uuid()`, `z.url()` not `z.string().email()`
- `migrate-native-enum` — Use unified `z.enum()` for TS enums; `z.nativeEnum()` is deprecated
- `migrate-error-api` — Use the `error` parameter; `errorMap` is gone and `message` is deprecated

### 7. Advanced Patterns (MEDIUM)

- `pattern-branded-types` — `.brand<"Name">()` for nominal typing (USD vs EUR)
- `pattern-codecs` — `z.codec()` for bidirectional transforms (parse + serialize)
- `pattern-pipe` — `.pipe()` for staged parsing (string → number → validate range)

### 8. Architecture & Boundaries (CRITICAL/HIGH)

- `arch-boundary-parsing` — Parse at system boundaries (API handler, env, form, fetch); pass typed data to domain logic
- `arch-schema-organization` — Co-locate schemas with their boundary layer; domain types use `z.infer`
- `arch-schema-versioning` — Additive changes only for non-breaking evolution; new fields use `.optional()`

### 9. Observability (HIGH/MEDIUM)

- `observe-structured-errors` — Use `z.flattenError()` for compact structured logs with request correlation IDs
- `observe-error-metrics` — `trackedSafeParse()` wrapper to increment counters per schema and field on failure

## Schema Types Quick Reference

| Type | Syntax |
|------|--------|
| String | `z.string()` |
| Number | `z.number()`, `z.int()`, `z.float32()`, `z.float64()` |
| Boolean | `z.boolean()` |
| BigInt | `z.bigint()` |
| Date | `z.date()` |
| Undefined | `z.undefined()` |
| Null | `z.null()` |
| Void | `z.void()` |
| Any | `z.any()` |
| Unknown | `z.unknown()` |
| Never | `z.never()` |
| Literal | `z.literal("foo")`, `z.literal(42)` |
| Enum | `z.enum(["a", "b"])`, `z.enum(TSEnum)` |
| Email | `z.email()` |
| URL | `z.url()` |
| UUID | `z.uuid()` |
| String→Bool | `z.stringbool()` |
| ISO DateTime | `z.iso.datetime()` |
| File | `z.file()` |
| JSON value | `z.json()` (validates a value; does not parse a string) |
| Array | `z.array(schema)` |
| Tuple | `z.tuple([a, b])` |
| Object | `z.object({})` |
| Strict Object | `z.strictObject({})` |
| Loose Object | `z.looseObject({})` |
| Record | `z.record(keySchema, valueSchema)` |
| Map | `z.map(keySchema, valueSchema)` |
| Set | `z.set(schema)` |
| Union | `z.union([a, b])` |
| Disc. Union | `z.discriminatedUnion("key", [...])` |
| Intersection | `z.intersection(a, b)` |

## How to Use

Read individual rule files for detailed explanations and code examples:

```text
rules/parse-use-safeParse.md
rules/schema-object-unknowns.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and decision tables

## References

| Priority | Reference | When to read |
|----------|-----------|-------------|
| 1 | `references/schema-types.md` | Primitives, string formats, numbers, enums, dates, functions, branded types |
| 2 | `references/parsing-and-inference.md` | parse, safeParse, validate, z.infer, coercion, Standard Schema |
| 3 | `references/objects-and-composition.md` | Objects, optional keys, arrays, unions, pick/omit/partial, recursive, properties |
| 4 | `references/refinements-and-transforms.md` | refine, superRefine, transform, pipe, defaults |
| 5 | `references/error-handling.md` | ZodError, flattenError, treeifyError, error customization |
| 6 | `references/behaviour-changes.md` | What parses differently in 4.0, 4.4, 4.5 and 4.6; read before an upgrade |
| 7 | `references/codecs.md` | z.codec, decode and encode, what runs in each direction, copy-in recipes |
| 8 | `references/metadata-and-json-schema.md` | Registries, .meta(), z.toJSONSchema options, z.fromJSONSchema |
| 9 | `references/compile.md` | z.compile, zod/compile, what does not compile, z.withParser, bundle cost |
| 10 | `references/anti-patterns.md` | Common mistakes with BAD/GOOD examples |
| 11 | `references/boundary-architecture.md` | Where Zod fits: Express, tRPC, Next.js, React Hook Form, env, external APIs |
| 12 | `references/linter-and-ci.md` | ESLint rules, CI schema snapshots, unused schema detection, circular deps |
| 13 | `references/testing.md` | Testing schemas: safeParse in tests, boundary values, error assertions, mock data, property-based testing |
| 14 | `references/testing-api.md` | Jest and Vitest API reference for schema tests |
| 15 | `references/testing-anti-patterns.md` | Testing mistakes with BAD/GOOD examples |

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
