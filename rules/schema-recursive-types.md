---
title: Recursive Schema Design
impact: CRITICAL
description: Define recursive schemas with a getter. Cyclic input parses since Zod 4.5.
tags: recursive, getter, lazy, tree, cyclic
---

# Recursive Schema Design

## Problem

A schema for a tree (categories, comments, an org chart) refers to itself. A direct self-reference fails, because the variable is not yet defined when the object literal runs. The Zod 3 pattern, `z.lazy()` with a hand-written interface, still works in Zod 4, but the interface duplicates the schema and drifts from it.

## Incorrect

```typescript
// BUG: the hand-written interface and the schema can drift apart
interface CategoryShape {
  name: string
  children: CategoryShape[]
}

const Category: z.ZodType<CategoryShape> = z.object({
  name: z.string(),
  children: z.lazy(() => z.array(Category)),
})
```

## Correct

```typescript
// GOOD: a getter defers the reference until parse time, and z.infer resolves the type
const Category = z.object({
  name: z.string(),
  get children() {
    return z.array(Category)
  },
})

type Category = z.infer<typeof Category>
// { name: string; children: Category[] }
```

When TypeScript reports TS7023 ("implicitly has return type 'any'") on a getter, annotate the getter's return type:

```typescript
const Activity = z.object({
  name: z.string(),
  get subactivities(): z.ZodNullable<z.ZodArray<typeof Activity>> {
    return z.nullable(z.array(Activity))
  },
})
```

## Why

The getter is the documented way to define recursive objects in Zod 4 (zod.dev/api, "Recursive objects"). The result is a plain `ZodObject`, so `.pick()`, `.omit()`, `.partial()` and `.extend()` keep working. Mutually recursive schemas (a `User` with `posts`, a `Post` with an `author`) use the same pattern.

Since Zod 4.5, cyclic input parses: an object that contains itself comes back as an output graph with the same cycles. Zod Mini needs a memoizer registered for this (zod.dev/api). `z.lazy()` is not removed and not deprecated; `z.json()` is built on it.
