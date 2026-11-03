---
title: Spread Over Extend for Large Schemas
impact: MEDIUM
description: Use spread syntax with .shape over .extend() for large schemas to reduce compile-time cost.
tags: performance, extend, spread, typescript
---

# Spread Over Extend for Large Schemas

## Problem

`.extend()` is expensive for the TypeScript compiler on large schemas, and a TypeScript limitation makes chained calls quadratically more expensive (zod.dev/api, "`.extend()`").

## Incorrect

```typescript
// BAD: each .extend() creates a new TS type — slow compile
const Base = z.object({ id: z.string(), created: z.date() })
const WithName = Base.extend({ name: z.string() })
const WithEmail = WithName.extend({ email: z.email() })
const WithRole = WithEmail.extend({ role: z.enum(["admin", "user"]) })
// 4 intermediate types for TypeScript to resolve
```

## Correct

```typescript
const Base = z.object({ id: z.string(), created: z.date() })
const Extra = { name: z.string(), email: z.email(), role: z.enum(["admin", "user"]) }

// GOOD: single z.object with spread — one type instantiation
const Full = z.object({ ...Base.shape, ...Extra })
```

## Why

`.extend()` is fine for one-off extensions. For large hierarchies, spreading `.shape` into one `z.object()` keeps compile times down, and the same syntax works in Zod Mini. The two forms differ at runtime:

| | `Base.extend({...})` | `z.object({ ...Base.shape, ... })` |
|---|---|---|
| Strictness of `Base` | Kept | Lost: you choose `z.object`, `z.strictObject` or `z.looseObject` |
| Refinements on `Base` | Kept; throws if a new key overwrites an existing one | Lost: `.shape` holds only the fields |
| Overwrite a key on a refined `Base` | Use `.safeExtend()`, which also checks the new schema is assignable | Allowed |

Measured on zod 4.6.7. The zod.dev API page says `.extend()` throws on any schema with refinements; 4.6.7 throws only when a key is overwritten.
