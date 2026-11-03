---
title: Use .validate() When You Need Only a Boolean
impact: MEDIUM
description: Use .validate() for a yes or no, because it builds no error; use safeParse() when you need the parsed value.
tags: parsing, validate, performance, type-guard
---

# Use .validate() When You Need Only a Boolean

## Problem

`.safeParse(x).success` builds a full `ZodError` for each failure and then discards it. `.validate()` (Zod 4.6) returns a boolean, stops at the first failure and builds no error. It has a trap: it narrows the value to the schema's input type and returns no output, so after a transform, a default or a codec the narrowed value is the raw input.

## Incorrect

```typescript
const Item = z.object({ id: z.string(), price: z.number().nonnegative() })

// Builds and discards a ZodError for every invalid item
function validItems(items: unknown[]) {
  return items.filter((item) => Item.safeParse(item).success)
}

const Port = z.string().regex(z.regexes.integer).transform(Number)

function nextPort(raw: unknown) {
  if (Port.validate(raw)) {
    return raw + 1 // BUG: raw has the input type, string, so "8080" + 1 is "80801"
  }
  return undefined
}
```

## Correct

```typescript
function validItems(items: unknown[]) {
  return items.filter((item) => Item.validate(item))
}

function nextPort(raw: unknown) {
  const result = Port.safeParse(raw)
  return result.success ? result.data + 1 : undefined
}
```

## Why

The zod.dev basics page measures `.validate()` as up to 16x faster than `.safeParse().success` on invalid input, and the 4.6 release post measures up to 35x on a schema compiled with `z.compile()`. Use it for filters, guards and routing decisions. Use `.safeParse()` when you need the transformed value or the issues.

On a schema with an async refinement, `.validate()` throws, as `.safeParse()` does; use `.validateAsync()`.
