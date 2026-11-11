---
title: "The Four Error Parameters (Zod 3)"
impact: MEDIUM
description: In a Zod 3 file message, required_error, invalid_type_error and errorMap are the error API. The Zod 4 `error` parameter does not exist; an error map returns { message }.
tags: migration, errors, errorMap, zod3
---

# The Four Error Parameters (Zod 3)

Zod 4 form: `rules/migrate-error-api.md`, whose "Incorrect" block is the correct Zod 3 code.

## Problem

Zod 4 replaces four parameters with `error`, and an error map returns a string. A Zod 3 file keeps the four, and its maps return `{ message }`.

## Incorrect

```typescript
// @ts-expect-error `error` is not a Zod 3 parameter; the default message appears at runtime
const email = z.string().email({ error: "Bad email" })
```

## Correct

```typescript
// a check: message, or the string alone
const age = z.number().min(18, { message: "Must be 18 or older" })
const ageShort = z.number().min(18, "Must be 18 or older")

// a schema: required_error and invalid_type_error
const name = z.string({ required_error: "Required", invalid_type_error: "Must be text" })

// a map: receives the issue and ctx, returns { message }
const email = z.string({
  errorMap: (issue, ctx) =>
    issue.code === z.ZodIssueCode.invalid_type && issue.received === "undefined"
      ? { message: "Email is required" }
      : { message: ctx.defaultError },
})

// a global map, lowest priority above the default
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.too_small) return { message: `Minimum is ${issue.minimum}` }
  return { message: ctx.defaultError }
})
```

## Why

When the file moves to `zod/v4`: `message` keeps compiling as a deprecated parameter; `required_error`, `invalid_type_error` and `errorMap` are rejected by TypeScript and ignored at runtime, so they are the first thing to rewrite, into one `error` function that reads `issue.input === undefined` for the missing case. Precedence also flips: in Zod 3 a map passed to `.parse()` wins over the schema's (V5); in Zod 4 the schema's wins.
