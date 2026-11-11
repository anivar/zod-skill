---
title: "Refine for Validation, Transform for Conversion (Zod 3)"
impact: HIGH
description: In Zod 3 check a numeric string with a regex literal, convert with .transform(Number), and validate the number with .pipe(z.number().int()). z.regexes and z.int() do not exist.
tags: refinement, transform, pipe, zod3
---

# Refine for Validation, Transform for Conversion (Zod 3)

Zod 4 form: `rules/refine-vs-transform.md`.

## Problem

The Zod 4 rule uses `z.regexes.integer` and `z.int()`. Neither exists in Zod 3. `.pipe()` does, so the shape of the fix is the same: check the string, convert it, check the number.

## Incorrect

```typescript
// BUG: parseInt("12abc") is 12, so "12abc" passes
const LooseInt = z
  .string()
  .refine((val) => !Number.isNaN(Number.parseInt(val, 10)), { message: "Must be a numeric string" })
  .transform((val) => Number.parseInt(val, 10))

// @ts-expect-error z.regexes does not exist in Zod 3
const Pattern = z.regexes.integer
```

## Correct

```typescript
// GOOD: check the string, convert it, then check the number
const StringToInt = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0))

StringToInt.parse("42") // 42
StringToInt.safeParse("12abc").success // false
```

## Why

`.regex()` gives an `invalid_string` issue with `validation: "regex"` for anything that is not all digits. `.transform(Number)` converts the survivors, and `.pipe()` validates the number with its own checks. `z.number().int()` is the Zod 3 integer check; it accepts integers outside the safe range, which Zod 4's `z.int()` rejects (V15). To report a failure from inside a transform, use `ctx.addIssue()` and `z.NEVER` (`v3/rules/refine-never-throw.md`).
