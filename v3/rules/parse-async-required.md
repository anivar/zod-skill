---
title: "Use parseAsync for Async Refinements (Zod 3)"
impact: CRITICAL
description: Must use parseAsync()/safeParseAsync() in Zod 3 when a schema has an async refinement or transform. The sync parse throws; the message names .parseAsync.
tags: parsing, async, refinement, zod3
---

# Use parseAsync for Async Refinements (Zod 3)

Zod 4 form: `rules/parse-async-required.md`. The rule is the same; the message parameter and the error text differ.

## Problem

A schema with `.refine(async ...)` or `.transform(async ...)` cannot be parsed synchronously. Zod 3 throws a plain `Error` whose message reads "Async refinement encountered during synchronous parse operation. Use .parseAsync instead." (V16). The refinement does not run.

## Incorrect

```typescript
const UniqueEmail = z.string().email().refine(
  async (email) => !(await db.users.exists(email)),
  { message: "Email already registered" }
)

// BUG: sync parse with an async refinement throws
const result = UniqueEmail.safeParse(input)
```

## Correct

```typescript
const UniqueEmail = z.string().email().refine(
  async (email) => !(await db.users.exists(email)),
  { message: "Email already registered" }
)

// CORRECT: safeParseAsync for a schema with an async refinement
const result = await UniqueEmail.safeParseAsync(input)
if (!result.success) {
  console.log(result.error.issues)
}
```

## Why

Zod separates sync and async parsing in both versions. The throw is not a `ZodError`, so a caller that relies on `safeParse()` never throwing gets an unhandled exception. Zod 3 has no `.validate()` or `.validateAsync()`; the boolean form is `(await schema.safeParseAsync(x)).success`. Test the async path: a happy-path test of another schema does not reach it.
