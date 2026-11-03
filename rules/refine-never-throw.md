---
title: Never Throw in Refinements
impact: HIGH
description: Refinement and transform functions must never throw. Return false from .refine(), add issues in .superRefine(), push onto ctx.issues in .transform().
tags: refine, superRefine, transform, throw, error
---

# Never Throw in Refinements

## Problem

An exception thrown inside a `.refine()` or `.transform()` function is not turned into a Zod issue. It escapes `.parse()` and `.safeParse()` as a plain `Error`, so a caller that relies on `safeParse()` never throwing gets an unhandled exception.

## Incorrect

```typescript
// BUG: the throw escapes safeParse()
const PositiveNumber = z.number().refine((n) => {
  if (n <= 0) throw new Error("Must be positive")
  return true
})
```

## Correct

```typescript
// GOOD: .refine() returns a boolean; its function receives only the value
const PositiveNumber = z.number().refine((n) => n > 0, { error: "Must be positive" })

// GOOD: .superRefine() receives ctx and can add several issues
const Password = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({ code: "custom", message: "Password must be at least 8 characters", input: val })
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({ code: "custom", message: "Password must contain an uppercase letter", input: val })
  }
})

// GOOD: a transform reports a failure by pushing onto ctx.issues and returning z.NEVER
const NumericString = z.string().transform((val, ctx) => {
  const n = Number(val)
  if (Number.isNaN(n)) {
    ctx.issues.push({ code: "custom", message: "Not a number", input: val })
    return z.NEVER
  }
  return n
})
```

## Why

`.refine()` expects a boolean, or a `Promise<boolean>` for an async check. Its function gets the value only, with no `ctx`. `.superRefine()` gets `(value, ctx)` and reports with `ctx.addIssue()`. A `.transform()` gets `(value, ctx)` and reports with `ctx.issues.push()` (zod.dev/api, "Refinements" and "Transforms"). Each of these becomes a Zod issue in the result; a throw does not.
