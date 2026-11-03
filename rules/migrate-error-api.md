---
title: "v4: Unified Error Parameter"
impact: MEDIUM
description: Replace message, required_error, invalid_type_error and errorMap with the error parameter.
tags: migration, v4, errors, message, errorMap
---

# v4: Unified Error Parameter

## Problem

Zod 3 had four ways to customize errors: `message`, `required_error`, `invalid_type_error` and `errorMap`. Zod 4 replaces them with one `error` parameter. `message` still works and is deprecated. The other three are gone: TypeScript rejects them, and at runtime Zod ignores them.

## Incorrect

```typescript
// BAD: Zod 3 parameters
const name = z.string({
  // @ts-expect-error not a Zod 4 parameter; ignored at runtime
  required_error: "Required",
})
// @ts-expect-error errorMap is now `error`; ignored at runtime
const email = z.email({ errorMap: () => ({ message: "Bad email" }) })
const age = z.number().min(18, { message: "Too young" }) // `message` is deprecated
```

## Correct

```typescript
// GOOD: a string
const age = z.number().min(18, { error: "Must be 18 or older" })
const ageShort = z.number().min(18, "Must be 18 or older")

// GOOD: a function, which replaces errorMap; it returns a string, or undefined to use the next error map
const email = z.email({
  error: (issue) => (issue.input === undefined ? "Email is required" : "Enter a valid email"),
})
```

## Why

An error map in Zod 4 returns a plain string instead of `{ message }`. Precedence also changed: a schema-level error now wins over an error map passed to `.parse()` (zod.dev/v4/changelog). For a global map, use `z.config({ customError })`.
