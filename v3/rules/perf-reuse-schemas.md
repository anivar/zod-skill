---
title: "Reuse Schemas with Composition (Zod 3)"
impact: MEDIUM
description: Define schemas once in Zod 3 and derive variants with .pick(), .omit(), .partial() and .required(); .deepPartial() is a method, and .exactPartial() does not exist.
tags: performance, composition, pick, omit, partial, zod3
---

# Reuse Schemas with Composition (Zod 3)

Zod 4 form: `rules/perf-reuse-schemas.md`.

## Problem

Duplicated field definitions drift. The derivation methods are the same in both versions, with two differences: Zod 3 has `.deepPartial()` as a method, which Zod 4 removes, and Zod 3 has no `.exactPartial()`.

## Incorrect

```typescript
// BAD: fields duplicated across schemas
const UserCreate = z.object({ name: z.string(), email: z.string().email(), password: z.string().min(8) })
const UserUpdate = z.object({ name: z.string().optional(), email: z.string().email().optional() })

const User = z.object({ id: z.string(), name: z.string() })
// @ts-expect-error .exactPartial() does not exist in Zod 3
const Patch = User.exactPartial()
```

## Correct

```typescript
const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  createdAt: z.date(),
})

const UserCreate = User.omit({ id: true, createdAt: true })
const UserUpdate = User.pick({ name: true, email: true }).partial()
const UserResponse = User.omit({ password: true })
```

## Why

`.pick()`, `.omit()`, `.partial()` and `.required()` derive from one base, so a change propagates. `.partial()` makes every key optional and accepts an explicit `undefined`; Zod 4's `.exactPartial()` makes the key omittable only. Zod 3's `.deepPartial()` method makes nested objects partial too, and its own typings already mark it deprecated; Zod 4 removes the method and, since 4.5, offers the function `z.deepPartial(schema)` instead (`rules/perf-reuse-schemas.md`).
