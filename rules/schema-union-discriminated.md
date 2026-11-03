---
title: Use Discriminated Unions
impact: CRITICAL
description: Use z.discriminatedUnion() for tagged object unions instead of z.union().
tags: union, discriminated, tagged, performance
---

# Use Discriminated Unions

## Problem

`z.union()` tries each branch sequentially until one matches. For object unions with a shared discriminator field (like `type` or `kind`), this is slow and produces confusing error messages that show issues from every branch.

## Incorrect

```typescript
// BAD: tries each branch sequentially, error shows issues from all branches
const Shape = z.union([
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("square"), side: z.number() }),
  z.object({ type: z.literal("rect"), width: z.number(), height: z.number() }),
])
// { type: "triangle" } fails with one invalid_union issue at path [], message "Invalid input",
// and an `errors` array holding every branch's issues
```

## Correct

```typescript
// GOOD: picks the branch by the discriminator; issues name the failing field
const Shape = z.discriminatedUnion("type", [
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("square"), side: z.number() }),
  z.object({ type: z.literal("rect"), width: z.number(), height: z.number() }),
])
// { type: "triangle" } fails at path ["type"]:
//   "Invalid discriminator value. Expected 'circle' | 'square' | 'rect'"
// { type: "circle", radius: "x" } reports only the circle branch: invalid_type at ["radius"]
```

## Why

`discriminatedUnion` checks the discriminator field first, then only validates the matching branch. It does not try the other branches, so the issues name the field that is wrong. In Zod 4 a discriminator can be a literal, an enum, a union of literals, `null` or `undefined`, and a discriminated union can be an option of another one (zod.dev/v4). `z.getDiscriminatedOption(Shape, "circle")` (Zod 4.5) returns one branch as a `ZodObject`. To require that exactly one branch matches, use `z.xor([a, b])`.
