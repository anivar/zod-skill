---
title: "Infer Types from Schemas (Zod 3)"
impact: CRITICAL
description: Use z.infer<typeof Schema> for output types in Zod 3 too; never duplicate types by hand. To check a schema against an existing type, annotate it as z.ZodType<T>; z.toZod() does not exist.
tags: typescript, inference, types, zod3
---

# Infer Types from Schemas (Zod 3)

Zod 4 form: `rules/parse-infer-types.md`. `z.infer`, `z.input` and `z.output` are the same; the type-first check differs.

## Problem

A hand-written interface beside a schema drifts from it. Zod 4 adds `z.toZod<T>()` to check a schema against a type you do not own, and it rejects extra keys. Zod 3 has no `z.toZod()`; the annotation `z.ZodType<T>` checks the output type, and it lets an extra key through.

## Incorrect

```typescript
// BUG: manual type will drift from the schema
interface User {
  name: string
  email: string
  age: number
}

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0),
})

type Player = { username: string; xp: number }

// @ts-expect-error z.toZod() does not exist in Zod 3
const Checked = z.toZod<Player>()(z.object({ username: z.string(), xp: z.number() }))
```

## Correct

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0),
})

// Output type (after parsing and transforms)
type User = z.infer<typeof UserSchema>

// Input type (before transforms, for form state)
type UserInput = z.input<typeof UserSchema>

// Type first: the annotation rejects a missing or wrongly typed field
type Player = { username: string; xp: number }

// @ts-expect-error xp is missing
const Incomplete: z.ZodType<Player> = z.object({ username: z.string() })

const PlayerSchema: z.ZodType<Player> = z.object({ username: z.string(), xp: z.number() })
```

## Why

`z.infer` extracts the output type and `z.input` the input type, so both stay in step with the schema. The `z.ZodType<T>` annotation catches a schema that produces too little or the wrong type; it does not catch an extra key, because the wider object is assignable to `T`. An annotated schema is typed as `ZodType`, so `.pick()`, `.omit()` and `.shape` are no longer available on it; keep the unannotated schema for derivation and annotate a copy when the check is wanted.
