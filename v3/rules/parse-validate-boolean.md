---
title: "A Yes or No Is safeParse().success (Zod 3)"
impact: MEDIUM
description: Zod 3 has no .validate(). Read .safeParse(x).success for a boolean, and use the parsed value from .data when you need it.
tags: parsing, validate, safeParse, zod3
---

# A Yes or No Is safeParse().success (Zod 3)

Zod 4 form: `rules/parse-validate-boolean.md`.

## Problem

`.validate()` arrives in Zod 4.6. A Zod 3 schema has no such method, so a call to it fails to compile, and a JavaScript file fails at runtime.

## Incorrect

```typescript
const Item = z.object({ id: z.string(), price: z.number().nonnegative() })

function validItems(items: unknown[]) {
  // @ts-expect-error .validate() does not exist in Zod 3
  return items.filter((item) => Item.validate(item))
}
```

## Correct

```typescript
function validItems(items: unknown[]) {
  return items.filter((item) => Item.safeParse(item).success)
}

const Port = z.string().regex(/^\d+$/).transform(Number)

function nextPort(raw: unknown) {
  const result = Port.safeParse(raw)
  return result.success ? result.data + 1 : undefined
}
```

## Why

`.safeParse(x).success` is the Zod 3 boolean. It builds a `ZodError` for every failure and discards it, which is the cost `.validate()` removes in Zod 4; the trap that `.validate()` carries, a value narrowed to the input type, does not exist here. When the parsed value is needed, read `.data` from the same result rather than parsing twice.
