---
title: "Spread Over Extend for Large Schemas (Zod 3)"
impact: MEDIUM
description: Use spread syntax with .shape over chained .extend() or .merge() for large schemas in Zod 3; .safeExtend() does not exist.
tags: performance, extend, merge, zod3
---

# Spread Over Extend for Large Schemas (Zod 3)

Zod 4 form: `rules/perf-extend-spread.md`.

## Problem

Chained `.extend()` calls make TypeScript resolve one intermediate type per call. Zod 3 also has `.merge()`, which takes another object schema; Zod 4 deprecates it in favour of `.extend()` and adds `.safeExtend()`, which Zod 3 does not have.

## Incorrect

```typescript
// BAD: each call creates a type for TypeScript to resolve
const Base = z.object({ id: z.string(), created: z.date() })
const WithName = Base.extend({ name: z.string() })
const WithEmail = WithName.merge(z.object({ email: z.string().email() }))
const WithRole = WithEmail.extend({ role: z.enum(["admin", "user"]) })
```

## Correct

```typescript
const Base = z.object({ id: z.string(), created: z.date() })
const Extra = { name: z.string(), email: z.string().email(), role: z.enum(["admin", "user"]) }

// GOOD: one z.object() with spread — one type instantiation
const Full = z.object({ ...Base.shape, ...Extra })

// Two existing schemas: spread both shapes
const Contact = z.object({ phone: z.string() })
const Merged = z.object({ ...Base.shape, ...Contact.shape })
```

## Why

Spreading `.shape` into one `z.object()` is the form the migration guide recommends for compile time, and it is the one form that reads the same in Zod 3 and Zod 4. `.extend()` is fine for a one-off addition. `.merge()` compiles in Zod 3 and as a deprecated method in Zod 4; writing the spread now saves the rewrite.
