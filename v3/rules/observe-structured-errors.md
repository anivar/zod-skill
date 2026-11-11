---
title: "Log Structured Errors, Not Raw ZodError (Zod 3)"
impact: HIGH
description: Use error.flatten() for compact, structured logs with request correlation IDs in Zod 3. Never log a raw ZodError.
tags: observability, logging, flatten, zod3
---

# Log Structured Errors, Not Raw ZodError (Zod 3)

Zod 4 form: `rules/observe-structured-errors.md`. The rule is the same; the flattening call is a method.

## Problem

A raw `ZodError` logs as a nested issue array that no log query can filter by field or schema. Zod 4 flattens with `z.flattenError()`; Zod 3 flattens with the `.flatten()` method on the error.

## Incorrect

```typescript
const UserSchema = z.object({ name: z.string(), email: z.string().email() })

// BUG: raw ZodError is noisy and unqueryable
app.post("/api/users", (req, res) => {
  const result = UserSchema.safeParse(req.body)
  if (!result.success) {
    logger.error("Validation failed", { error: result.error })
    return res.status(400).json({ error: "Invalid input" })
  }
})
```

## Correct

```typescript
app.post("/api/users", (req, res) => {
  const result = UserSchema.safeParse(req.body)
  if (!result.success) {
    const flat = result.error.flatten()
    logger.warn("validation_failed", {
      requestId: req.get("x-request-id"),
      schema: "UserSchema",
      path: req.path,
      formErrors: flat.formErrors,
      fieldErrors: flat.fieldErrors,
    })
    return res.status(400).json({ errors: flat.fieldErrors })
  }
})
```

## Why

`fieldErrors` maps each field to its messages and `formErrors` holds the object-level issues, the same shape Zod 4's `z.flattenError()` returns. With the request id and the schema name beside them, the log line is queryable by schema, by field and by request.
