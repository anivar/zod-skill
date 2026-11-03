---
title: Use parseAsync for Async Refinements
impact: CRITICAL
description: Must use parseAsync()/safeParseAsync() when schema has async refinements or transforms.
tags: parsing, async, refinement, transform
---

# Use parseAsync for Async Refinements

## Problem

When a schema contains async refinements (`.refine(async ...)`) or async transforms (`.transform(async ...)`), calling synchronous `.parse()` or `.safeParse()` will throw an error. The async refinement will not execute.

## Incorrect

```typescript
const UniqueEmail = z.email().refine(
  async (email) => !(await db.users.exists(email)),
  { error: "Email already registered" }
)

// BUG: sync parse with an async refinement throws $ZodAsyncError
const result = UniqueEmail.safeParse(input)
```

## Correct

```typescript
const UniqueEmail = z.email().refine(
  async (email) => !(await db.users.exists(email)),
  { error: "Email already registered" }
)

// CORRECT: use safeParseAsync for schemas with async refinements
const result = await UniqueEmail.safeParseAsync(input)
if (!result.success) {
  console.log(result.error.issues)
}
```

## Why

Zod separates sync and async parsing. If any refinement or transform in the schema chain is async, you must use `parseAsync()` or `safeParseAsync()`. The sync version throws `$ZodAsyncError` ("Encountered Promise during synchronous parse"); it does not skip the refinement. The same holds for `.validate()`, whose async form is `.validateAsync()`. Test the async path, because a happy-path test of another schema does not reach it.
