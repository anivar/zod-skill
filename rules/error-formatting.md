---
title: Error Formatting Functions
impact: HIGH
description: Use z.flattenError() for flat forms, z.treeifyError() for nested data, z.prettifyError() for logs. z.formatError() is deprecated.
tags: errors, formatting, treeify, flatten, prettify
---

# Error Formatting Functions

## Problem

Zod 4 documents `z.formatError()` and the `.format()` and `.flatten()` methods on `ZodError` as deprecated. They still run. The top-level functions replace them.

## Incorrect

```typescript
const Signup = z.object({ email: z.email(), age: z.number().min(18) })

const result = Signup.safeParse(data)
if (!result.success) {
  // the docs mark z.formatError() deprecated in favour of z.treeifyError()
  const formatted = z.formatError(result.error)
}
```

## Correct

```typescript
const Signup = z.object({
  email: z.email(),
  address: z.object({ zip: z.string().length(5) }),
})

const result = Signup.safeParse(data)
if (!result.success) {
  // flat forms: { formErrors: string[], fieldErrors: { email?: string[], address?: string[] } }
  const flat = z.flattenError(result.error)
  flat.fieldErrors.email // e.g. ["Invalid email address"]

  // nested data: a tree that mirrors the schema; use optional chaining
  const tree = z.treeifyError(result.error)
  tree.properties?.address?.properties?.zip?.errors

  // logs and CLIs: one line per issue, with "→ at <path>" under each
  const pretty = z.prettifyError(result.error)
}
```

## Why

| Function | Output | Use case |
|----------|--------|----------|
| `z.flattenError()` | `{ formErrors, fieldErrors }` | One-level forms; nested issues land under the top-level key |
| `z.treeifyError()` | `{ errors, properties?, items? }`, nested like the schema | Nested forms, arrays, recursive schemas |
| `z.prettifyError()` | A multi-line string | Logs, debugging, CLI output |

Source: zod.dev/error-formatting.
