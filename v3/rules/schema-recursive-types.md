---
title: "Recursive Schema Design (Zod 3)"
impact: CRITICAL
description: Define a recursive schema in Zod 3 with z.lazy() and a z.ZodType<T> annotation. A getter leaves the inferred type as any, and cyclic input overflows the stack.
tags: schema, recursive, lazy, zod3
---

# Recursive Schema Design (Zod 3)

Zod 4 form: `rules/schema-recursive-types.md`.

## Problem

Zod 4 infers a recursive type from a getter in the object shape. In Zod 3 the getter runs at parse time (V12), but TypeScript cannot type it: the getter's return type refers to the schema being declared, so under `strict` the compiler rejects the declaration (TS7022) and the getter (TS7023) as implicit `any`. The Zod 3 form is `z.lazy()` with the type written out.

## Incorrect

```typescript
// BAD: parses, but does not compile under strict; without strict the children type is `any`
// @ts-expect-error TS7022: 'Category' implicitly has type 'any'
const Category = z.object({
  name: z.string(),
  // @ts-expect-error TS7023: 'children' implicitly has return type 'any'
  get children() {
    return z.array(Category)
  },
})
```

## Correct

```typescript
// GOOD: the interface names the type, z.lazy() defers the reference
interface Category {
  name: string
  children: Category[]
}

const Category: z.ZodType<Category> = z.object({
  name: z.string(),
  children: z.lazy(() => z.array(Category)),
})

// Extending a base keeps the base's fields inferred
const BaseNode = z.object({ id: z.string(), label: z.string() })

type Node = z.infer<typeof BaseNode> & { children: Node[] }

const Node: z.ZodType<Node> = BaseNode.extend({
  children: z.lazy(() => z.array(Node)),
})
```

## Why

`z.lazy()` takes a function, so `Category` exists by the time the function runs. The annotation does two jobs: it gives TypeScript the type the inference cannot produce, and it keeps the schema's `_output` in step with the interface. An annotated schema is a `ZodType`, not a `ZodObject`: `.pick()`, `.omit()` and `.extend()` are not available on `Category`; derive them from `BaseNode` instead.

Cyclic input, an object that contains itself, throws `RangeError: Maximum call stack size exceeded` in Zod 3 (V12). Break cycles before parsing. Zod 4 parses cycles and returns the cycle in the output.
