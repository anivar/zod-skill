---
title: "Error Formatting Functions (Zod 3)"
impact: HIGH
description: Use error.flatten() for flat forms and error.format() for nested data in Zod 3. The top-level z.flattenError(), z.treeifyError() and z.prettifyError() do not exist.
tags: errors, formatting, flatten, format, zod3
---

# Error Formatting Functions (Zod 3)

Zod 4 form: `rules/error-formatting.md`.

## Problem

Zod 4 formats an error with top-level functions and deprecates the methods. Zod 3 has only the methods.

## Incorrect

```typescript
const Signup = z.object({ email: z.string().email(), age: z.number().min(18) })

const result = Signup.safeParse(data)
if (!result.success) {
  // @ts-expect-error z.flattenError() does not exist in Zod 3
  const flat = z.flattenError(result.error)
}
```

## Correct

```typescript
const Signup = z.object({
  email: z.string().email(),
  address: z.object({ zip: z.string().length(5) }),
})

const result = Signup.safeParse(data)
if (!result.success) {
  // flat forms: { formErrors: string[], fieldErrors: { email?: string[], address?: string[] } }
  const flat = result.error.flatten()
  flat.fieldErrors.email // e.g. ["Invalid email"]

  // nested data: { _errors: string[], email?: { _errors: string[] }, address?: { _errors: [], zip?: { _errors: string[] } } }
  const tree = result.error.format()
  tree.address?.zip?._errors

  // logs: the issues as JSON
  const text = result.error.message
}
```

## Why

| Zod 3 | Output | Zod 4 |
|-------|--------|-------|
| `error.flatten()` | `{ formErrors, fieldErrors }` | `z.flattenError(error)` |
| `error.format()` | nested object with `_errors` at each level | `z.treeifyError(error)`, with `errors`, `properties`, `items` |
| `error.message` | the issues as pretty-printed JSON | `z.prettifyError(error)`, one line per issue |

`.flatten()` and `.format()` keep working after a move to `zod/v4` as deprecated methods, so a file can migrate in two steps.
