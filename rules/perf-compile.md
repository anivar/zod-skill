---
title: Compile the Final Schema, and Prove It Compiled
impact: MEDIUM
description: Pass the final schema to z.compile(); a derived schema is not compiled, and an unsupported schema falls back without an error.
tags: performance, compile, hot-path, csp, bundle-size
---

# Compile the Final Schema, and Prove It Compiled

## Problem

`z.compile()` (Zod 4.5) makes valid input parse faster on a hot path. It can fail without a sign. A method called on a compiled schema, such as `.refine()` or `.optional()`, returns a new schema that is not compiled. An async check or a `.catch()` function anywhere in the schema makes `z.compile()` return the original schema, uncompiled. No error tells you.

## Incorrect

```typescript
// BUG: .refine() returns a new schema, and the new schema is not compiled
const Order = z.compile(z.object({ id: z.string(), qty: z.int() })).refine((o) => o.qty > 0)

// BUG: a .catch() function anywhere makes z.compile() return the original schema
const Query = z.compile(z.object({ page: z.int().catch(() => 1) }))
```

## Correct

```typescript
const OrderShape = z.object({ id: z.string(), qty: z.int() }).refine((o) => o.qty > 0)
export const Order = z.compile(OrderShape)

const QueryShape = z.object({ page: z.int().catch(1) }) // a constant .catch() compiles
export const Query = z.compile(QueryShape)

// A test fails when a schema stops compiling
test("hot-path schemas compile", () => {
  expect(() => z.compile(OrderShape, { strict: true })).not.toThrow()
  expect(() => z.compile(QueryShape, { strict: true })).not.toThrow()
})
```

## Why

A compiled schema returns the same data and the same issues as the original, so compiling is safe where it applies. `strict: true` throws `z.ZodCompileUnsupportedError` or `z.ZodCompileAsyncError` instead of falling back, which makes the fall-back visible in a test.

On invalid input Zod runs the standard parser again to build the issues: failures do not get faster, and a refinement can run twice, so keep refinements free of side effects. Use `.validate()` when you need only a boolean. The compiler adds about 7 KB gzipped to a bundle that uses it. Under a strict Content Security Policy, `new Function` is blocked; install a parser generated at build time with `z.withParser()`. See `references/compile.md`.
