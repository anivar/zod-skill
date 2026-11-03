---
title: Custom Error Messages (v4 API)
impact: HIGH
description: Customize messages with the error parameter. required_error and invalid_type_error are gone; message is deprecated.
tags: errors, messages, v4, migration
---

# Custom Error Messages (v4 API)

## Problem

Zod 4 dropped `required_error` and `invalid_type_error`. TypeScript rejects them; plain JavaScript passes them and Zod ignores them, so the default message appears instead of yours. The `message` parameter still works but is deprecated.

## Incorrect

```typescript
// BUG: Zod 4 dropped these parameters, so the custom messages never appear
const Name = z.string({
  // @ts-expect-error required_error and invalid_type_error are not Zod 4 parameters
  required_error: "Name is required",
  invalid_type_error: "Name must be a string",
})

// `message` still works, but Zod 4 documents it as deprecated
const Age = z.number().min(18, { message: "Must be 18+" })
```

## Correct

```typescript
// GOOD: the error parameter takes a string
const Age = z.number().min(18, { error: "Must be 18+" })

// GOOD: or the string alone
const AgeShort = z.number().min(18, "Must be 18+")

// GOOD: a function tells a missing value from a wrong type
const Name = z.string({
  error: (issue) => (issue.input === undefined ? "Name is required" : "Name must be a string"),
})
```

## Why

Zod 4 puts every error customization under one `error` parameter (zod.dev/error-customization). It takes a string, or a function that receives the issue (`code`, `input`, `path`, and fields such as `minimum`) and returns a string, or `undefined` to fall through to the next error map. A schema-level error covers the issues its own checks raise, so `z.string("Invalid name").min(5)` reports "Invalid name" for a short string.
