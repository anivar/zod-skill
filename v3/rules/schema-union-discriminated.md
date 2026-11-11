---
title: "Use Discriminated Unions (Zod 3)"
impact: CRITICAL
description: Use z.discriminatedUnion() for tagged object unions in Zod 3 too. The discriminator must be a literal or enum per branch, and a bad tag reports invalid_union_discriminator.
tags: schema, union, discriminated, zod3
---

# Use Discriminated Unions (Zod 3)

Zod 4 form: `rules/schema-union-discriminated.md`. The API is the same; the error output and the limits differ.

## Problem

`z.union()` tries each branch and reports every branch's issues under one `invalid_union` issue whose `unionErrors` field holds a `ZodError` per branch. For objects with a shared tag, `z.discriminatedUnion()` picks the branch by the tag.

## Incorrect

```typescript
// BAD: tries each branch; the single issue carries every branch's errors in unionErrors
const Shape = z.union([
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("square"), side: z.number() }),
])
```

## Correct

```typescript
// GOOD: the tag picks the branch
const Shape = z.discriminatedUnion("type", [
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("square"), side: z.number() }),
])

// { type: "triangle" } fails at path ["type"] with code "invalid_union_discriminator":
//   "Invalid discriminator value. Expected 'circle' | 'square'"
// { type: "circle", radius: "x" } reports only the circle branch: invalid_type at ["radius"]
```

## Why

In Zod 3 a branch's discriminator is a `z.literal()`, `z.enum()`, `z.nativeEnum()` or `z.null()` schema. A plain `z.string()` discriminator throws at schema creation ("A discriminator value for key … could not be extracted"), and so does a discriminated union used as a branch (V19); Zod 4 allows the nested form. A wrong tag is its own code, `invalid_union_discriminator`, with the accepted values in `options`; Zod 4 reports it as `invalid_union` at the same path. `z.xor()` and `z.getDiscriminatedOption()` are Zod 4 additions.
