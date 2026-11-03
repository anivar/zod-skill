---
title: Refine for Validation, Transform for Conversion
impact: HIGH
description: Use .refine() to validate, .transform() to convert, and .pipe() to validate the converted value.
tags: refine, transform, pipe, validation, codec
---

# Refine for Validation, Transform for Conversion

## Problem

Validating inside `.transform()` by throwing bypasses Zod's errors: the exception escapes `safeParse()`. Checking a numeric string with `parseInt` accepts strings that only start with digits, because `parseInt("12abc")` returns `12`.

## Incorrect

```typescript
// BUG: the throw escapes safeParse() as a plain Error
const ThrowingInt = z.string().transform((val) => {
  const n = Number.parseInt(val, 10)
  if (Number.isNaN(n)) throw new Error("Not a number")
  return n
})

// BUG: parseInt("12abc") is 12, so "12abc" passes
const LooseInt = z
  .string()
  .refine((val) => !Number.isNaN(Number.parseInt(val, 10)), { error: "Must be a numeric string" })
  .transform((val) => Number.parseInt(val, 10))
```

## Correct

```typescript
// GOOD: check the string, convert it, then check the number
const StringToInt = z.string().regex(z.regexes.integer).transform(Number).pipe(z.int().min(0))

StringToInt.parse("42") // 42
StringToInt.safeParse("12abc").success // false
```

When the value must also go back to a string, use a codec instead (see `pattern-codecs`).

## Why

`.refine()` answers "is this valid?" and adds an issue when it is not. `.transform()` returns a new value and must not throw (zod.dev/api, "Transforms"). `.pipe()` feeds the output of one schema into the next, so the converted value is validated with its own checks. To report an issue from inside a transform, push it onto `ctx.issues` and return `z.NEVER`.
