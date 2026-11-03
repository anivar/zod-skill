---
title: Pipe for Staged Parsing
impact: MEDIUM
description: Use .pipe() to chain validation stages. Parse string → coerce number → validate range.
tags: pipe, staged, coerce, chain
---

# Pipe for Staged Parsing

## Problem

Complex validation chains that coerce and validate in multiple stages become messy when done in a single transform. Each stage should parse the output of the previous stage.

## Incorrect

```typescript
// BAD: everything in one transform — no intermediate validation
const PortNumber = z.string().transform((val) => {
  const n = parseInt(val, 10)
  if (isNaN(n)) throw new Error("Not a number") // wrong: shouldn't throw
  if (n < 1 || n > 65535) throw new Error("Invalid port") // wrong: shouldn't throw
  return n
})
```

## Correct

```typescript
// GOOD: staged parsing with pipe
const PortNumber = z
  .string()
  .pipe(z.coerce.number()) // stage 1: string → number
  .pipe(z.int().min(1).max(65535)) // stage 2: validate range

PortNumber.parse("8080") // 8080
PortNumber.safeParse("abc").success // false: stage 1 fails
PortNumber.safeParse("99999").success // false: stage 2 fails
```

## Why

`.pipe()` feeds the output of one schema into another. Each stage produces Zod issues on failure, and each stage's type is inferred. `z.coerce.number()` accepts whatever `Number()` accepts, so `"0x50"` becomes 80, `"1e3"` becomes 1000 and `" 80 "` becomes 80. When only decimal digits are valid, check the string first: `z.string().regex(z.regexes.integer).transform(Number).pipe(z.int().min(1).max(65535))`.
