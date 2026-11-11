---
title: "Issues Carry No Input (Zod 3)"
impact: HIGH
description: Zod 3 has no reportInput option and never puts the input value on an issue. The leak risk is the body you log beside the issues; log the flattened field errors only.
tags: errors, security, logging, zod3
---

# Issues Carry No Input (Zod 3)

Zod 4 form: `rules/error-input-security.md`.

## Problem

Zod 4 adds `reportInput`, which copies the raw input onto every issue, and the rule says never to enable it in production. Zod 3 has no such option: an issue carries `code`, `path`, `message` and code-specific fields such as `expected`, `received` and `validation`, and `received` is a type name, not the value (V7). The exposure in Zod 3 comes from logging the request body next to the issues.

## Incorrect

```typescript
const UserSchema = z.object({ email: z.string().email(), password: z.string().min(12) })

app.post("/register", (req, res) => {
  // @ts-expect-error reportInput is not a Zod 3 parse option
  const result = UserSchema.safeParse(req.body, { reportInput: true })
  if (!result.success) {
    // BUG: the body carries the password; the issues did not
    logger.error("validation failed", { body: req.body, issues: result.error.issues })
    res.status(400).json({ errors: result.error.issues })
  }
})
```

## Correct

```typescript
app.post("/register", (req, res) => {
  const result = UserSchema.safeParse(req.body)
  if (!result.success) {
    const flat = result.error.flatten()
    logger.warn("validation_failed", { path: req.path, fieldErrors: flat.fieldErrors })
    res.status(400).json({ errors: flat.fieldErrors })
  }
})
```

## Why

`fieldErrors` holds messages keyed by field and nothing from the input. A `custom` issue carries whatever `params` the refinement put there, so keep secrets out of `params` too. After a move to `zod/v4`, the Zod 4 rule applies: leave `reportInput` off outside development.
