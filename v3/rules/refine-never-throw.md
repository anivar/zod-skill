---
title: "Never Throw in Refinements (Zod 3)"
impact: HIGH
description: Refinement and transform functions must never throw in Zod 3 either. Return false from .refine(), call ctx.addIssue() in .superRefine() and in a transform, and return z.NEVER from a failed transform.
tags: refinement, transform, errors, zod3
---

# Never Throw in Refinements (Zod 3)

Zod 4 form: `rules/refine-never-throw.md`.

## Problem

An exception thrown inside `.refine()` or `.transform()` escapes `safeParse()` as a plain `Error` in Zod 3 as in Zod 4 (V16). Zod 4 reports a transform failure by pushing onto `ctx.issues`; a Zod 3 transform context has no `issues` array, only `addIssue()` and `path`.

## Incorrect

```typescript
// BUG: the throw escapes safeParse()
const PositiveNumber = z.number().refine((n) => {
  if (n <= 0) throw new Error("Must be positive")
  return true
})

// BUG: ctx.issues does not exist in Zod 3
const NumericText = z.string().transform((val, ctx) => {
  const n = Number(val)
  // @ts-expect-error Zod 3's RefinementCtx has addIssue() and path, no issues
  if (Number.isNaN(n)) ctx.issues.push({ code: "custom", message: "Not a number" })
  return n
})
```

## Correct

```typescript
// GOOD: .refine() returns a boolean; message is the Zod 3 parameter
const PositiveNumber = z.number().refine((n) => n > 0, { message: "Must be positive" })

// GOOD: .superRefine() adds several issues through ctx
const Password = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password must be at least 8 characters" })
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password must contain an uppercase letter" })
  }
})

// GOOD: a transform reports with ctx.addIssue() and returns z.NEVER
const NumericString = z.string().transform((val, ctx) => {
  const n = Number(val)
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Not a number" })
    return z.NEVER
  }
  return n
})
```

## Why

Both `.superRefine()` and `.transform()` receive a `RefinementCtx` in Zod 3, with `addIssue()` and `path`. `z.ZodIssueCode.custom` is the code for a hand-written issue, and `z.NEVER` is the return value that says the transform produced nothing. Zod 4 keeps `ctx.addIssue()` in `.superRefine()`, replaces it in transforms with `ctx.issues.push()`, and drops `ctx.path`.
