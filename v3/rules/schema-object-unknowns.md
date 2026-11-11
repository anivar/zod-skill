---
title: "Handle Unknown Keys Explicitly (Zod 3)"
impact: CRITICAL
description: Default z.object() strips unknown keys. In Zod 3 choose .strict() to reject them or .passthrough() to keep them; z.looseObject() does not exist.
tags: schema, object, strict, passthrough, zod3
---

# Handle Unknown Keys Explicitly (Zod 3)

Zod 4 form: `rules/schema-object-unknowns.md`.

## Problem

`z.object()` strips any key the shape does not name, in both versions. Zod 4 names the alternatives as functions, `z.strictObject()` and `z.looseObject()`. Zod 3 names them as methods on the object schema; `z.strictObject()` exists in Zod 3 as well, `z.looseObject()` does not.

## Incorrect

```typescript
const Config = z.object({ host: z.string(), port: z.number() })

// BUG: unknown keys are silently dropped
const input = { host: "localhost", port: 3000, debug: true, logLevel: "verbose" }
Config.parse(input) // { host: "localhost", port: 3000 }

// @ts-expect-error z.looseObject() does not exist in Zod 3
const Loose = z.looseObject({ host: z.string() })
```

## Correct

```typescript
// REJECT unknown keys: an unrecognized_keys issue
const StrictConfig = z.object({ host: z.string(), port: z.number() }).strict()

// PRESERVE unknown keys
const LooseConfig = z.object({ host: z.string(), port: z.number() }).passthrough()

// STRIP unknown keys: the default, written out
const SafeConfig = z.object({ host: z.string(), port: z.number() }).strip()

// Validate unknown keys against one schema instead
const Headers = z.object({ host: z.string() }).catchall(z.string())
```

## Why

| Zod 3 | Unknown keys | Zod 4 |
|-------|-------------|-------|
| `z.object()` or `.strip()` | Stripped | `z.object()` |
| `.strict()` | Rejected with `unrecognized_keys` | `z.strictObject()` |
| `.passthrough()` | Kept | `z.looseObject()` |
| `.catchall(schema)` | Each parsed with `schema` | `.catchall(schema)` |

The migration guide (zod.dev/v4/changelog) keeps `.strict()` and `.passthrough()` in Zod 4 as legacy methods and deprecates `.strip()`, so a file that moves to `zod/v4` keeps compiling while it is rewritten.
