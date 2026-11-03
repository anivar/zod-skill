---
title: Infer Types from Schemas
impact: CRITICAL
description: Use z.infer<typeof Schema> for output types. Never manually duplicate types.
tags: inference, types, typescript, DRY
---

# Infer Types from Schemas

## Problem

Manually defining TypeScript interfaces alongside Zod schemas creates duplicate type definitions that drift apart. When the schema changes, the manual type is forgotten.

## Incorrect

```typescript
// BUG: manual type will drift from schema
interface User {
  name: string
  email: string
  age: number
}

const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().min(0),
})

// These can silently diverge when schema is updated
```

## Correct

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number().min(0),
})

// Output type (after parsing/transforms)
type User = z.infer<typeof UserSchema>

// Input type (before transforms — useful for forms)
type UserInput = z.input<typeof UserSchema>
```

## Why

`z.infer` extracts the output type (after transforms). `z.input` extracts the input type (before transforms). These always stay in sync with the schema. Use `z.infer` for most cases; use `z.input` when you need the pre-transform shape (e.g., form state where a date field is a string before being transformed to Date).

When the type comes first, from a generated client or a type you do not own, check the schema against it with `z.toZod<T>()` (Zod 4.5). It fails to compile on any difference, where `satisfies z.ZodType<T>` lets extra keys and `z.any()` through:

```typescript
type Player = { username: string; xp: number }

const Player = z.toZod<Player>()(
  z.object({
    username: z.string(),
    xp: z.number(),
  })
)
```
