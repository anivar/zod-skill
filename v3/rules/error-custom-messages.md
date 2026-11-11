---
title: "Custom Error Messages (Zod 3)"
impact: HIGH
description: Customize messages in Zod 3 with message, required_error, invalid_type_error and errorMap. The Zod 4 `error` parameter is not a Zod 3 parameter and is ignored.
tags: errors, messages, errorMap, zod3
---

# Custom Error Messages (Zod 3)

Zod 4 form: `rules/error-custom-messages.md`.

## Problem

Zod 4 puts every customization under one `error` parameter. In Zod 3 that key is unknown: TypeScript rejects it, and plain JavaScript gets the default message (V4). Zod 3 has four parameters, each for one situation.

## Incorrect

```typescript
// BUG: `error` is a Zod 4 parameter; Zod 3 shows the default message
// @ts-expect-error not a Zod 3 parameter
const Age = z.number().min(18, { error: "Must be 18+" })
```

## Correct

```typescript
// GOOD: message on a check, or the string alone
const Age = z.number().min(18, { message: "Must be 18+" })
const AgeShort = z.number().min(18, "Must be 18+")

// GOOD: required_error for a missing value, invalid_type_error for a wrong type
const Name = z.string({
  required_error: "Name is required",
  invalid_type_error: "Name must be a string",
})

// GOOD: an error map for anything else; return { message }, and ctx.defaultError to keep the default
const Email = z.string({
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === "undefined") {
      return { message: "Email is required" }
    }
    return { message: ctx.defaultError }
  },
})
```

## Why

`message` names one check's text, `required_error` and `invalid_type_error` cover the two `invalid_type` cases on the schema, and `errorMap` sees every issue. An error map returns `{ message }`; `ctx.defaultError` is the message the lower-priority map produced. Precedence in Zod 3, highest first: the map passed to `.parse()`, the schema's map or parameters, `z.setErrorMap()`, the default (V5). Zod 4 reverses the first two.
