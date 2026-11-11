---
title: "Pipe for Staged Parsing (Zod 3)"
impact: MEDIUM
description: Use .pipe() in Zod 3 to chain stages: check the string, coerce the number, validate the range. z.regexes and z.int() do not exist; use a regex literal and z.number().int().
tags: pipe, coercion, staged-parsing, zod3
---

# Pipe for Staged Parsing (Zod 3)

Zod 4 form: `rules/pattern-pipe.md`.

## Problem

A single transform that throws on every failure bypasses Zod's issues. `.pipe()` exists in Zod 3 (V17) and feeds one schema's output into the next, so each stage reports its own issue.

## Incorrect

```typescript
// BAD: everything in one transform, and throws escape safeParse()
const PortNumber = z.string().transform((val) => {
  const n = parseInt(val, 10)
  if (isNaN(n)) throw new Error("Not a number")
  if (n < 1 || n > 65535) throw new Error("Invalid port")
  return n
})
```

## Correct

```typescript
// GOOD: staged parsing with pipe
const PortNumber = z
  .string()
  .pipe(z.coerce.number()) // stage 1: string → number
  .pipe(z.number().int().min(1).max(65535)) // stage 2: validate the range

PortNumber.parse("8080") // 8080
PortNumber.safeParse("abc").success // false: stage 1 fails
PortNumber.safeParse("99999").success // false: stage 2 fails

// Decimal digits only: check the string first
const StrictPort = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(65535))
```

## Why

`z.coerce.number()` accepts whatever `Number()` accepts, so `"0x50"` becomes 80 and `" 80 "` becomes 80 (V18); the regex stage removes those when only decimal digits are valid. `z.number().int()` is the Zod 3 integer check. After a move to `zod/v4`, `z.int()` and `z.regexes.integer` replace the two.
