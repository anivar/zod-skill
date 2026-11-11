---
title: "Coercion Pitfalls — Boolean Strings (Zod 3)"
impact: CRITICAL
description: z.coerce.boolean() makes "false" → true in Zod 3 too. There is no z.stringbool(); parse the accepted strings with an enum and a transform.
tags: schema, coercion, boolean, zod3
---

# Coercion Pitfalls — Boolean Strings (Zod 3)

Zod 4 form: `rules/schema-coercion-pitfalls.md`.

## Problem

`z.coerce.boolean()` calls `Boolean(input)`, and `Boolean("false")` is `true`. Zod 4 adds `z.stringbool()` for this. Zod 3 has no such schema; it also fills a missing key with `false` when the field is `z.coerce.boolean()`, where Zod 4 reports an issue.

## Incorrect

```typescript
// BUG: Boolean("false") === true, Boolean("0") === true
const Settings = z.object({
  debug: z.coerce.boolean(),
  verbose: z.coerce.boolean(),
})

Settings.parse({ debug: "false", verbose: "0" }) // { debug: true, verbose: true }

// @ts-expect-error z.stringbool() does not exist in Zod 3
const Flag = z.stringbool()
```

## Correct

```typescript
// GOOD: name the accepted strings, then map them
const StringBool = z
  .enum(["true", "false", "1", "0", "yes", "no", "on", "off"])
  .transform((v) => v === "true" || v === "1" || v === "yes" || v === "on")

// Case-insensitive: lower-case first
const StringBoolCI = z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), StringBool)

const Settings = z.object({ debug: StringBool, verbose: StringBoolCI })

Settings.parse({ debug: "false", verbose: "OFF" }) // { debug: false, verbose: false }
Settings.safeParse({ debug: "maybe", verbose: "0" }).success // false: invalid_enum_value at ["debug"]
```

## Why

An enum rejects anything outside the list with `invalid_enum_value`, and the transform maps the survivors. `z.coerce.boolean()` is for JavaScript truthiness only. When the file moves to `zod/v4`, `z.stringbool()` replaces the recipe and accepts the same eight strings plus `y`/`n` and `enabled`/`disabled`.
