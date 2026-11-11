---
title: "Co-locate Schemas with Their Boundary Layer (Zod 3)"
impact: HIGH
description: Place schemas next to the boundary that uses them in Zod 3 too. Domain types use z.infer and never re-export raw schemas across layers; the email format is the Zod 3 method.
tags: architecture, organization, layering, zod3
---

# Co-locate Schemas with Their Boundary Layer (Zod 3)

Zod 4 form: `rules/arch-schema-organization.md`. The layout is the same; the schemas use the Zod 3 string formats.

## Problem

One `schemas/` folder for every schema hides which boundary owns which schema: API routes, form validation and env parsing all mix together.

## Incorrect

```text
# BUG: everything in one folder — no layering, unclear ownership
src/
  schemas/
    user.ts          # used by API AND form AND env?
    order.ts
    config.ts
    form-profile.ts
    api-response.ts
    db-result.ts
```

```typescript
// BUG: domain module imports and re-exports a raw schema
// src/domain/user.ts
import { UserSchema } from "../schemas/user"
export { UserSchema } // leaking parsing into domain
```

## Correct

```text
src/
  api/
    users/
      route.ts
      schemas.ts       # API request/response schemas for /users
    orders/
      route.ts
      schemas.ts       # API schemas for /orders
  features/
    profile/
      form-schema.ts   # form validation schema
      ProfileForm.tsx
  config/
    env.ts             # env var schema, parsed at startup
  domain/
    types.ts           # z.infer types only — no raw schemas
```

```typescript
// api/users/schemas.ts — co-located with the route
import * as z from "zod"

export const CreateUserBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const UserResponse = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})
```

```typescript
// domain/types.ts — inferred types only, no raw schemas
import type { CreateUserBody, UserResponse } from "../api/users/schemas"
import type * as z from "zod"

export type CreateUser = z.infer<typeof CreateUserBody>
export type User = z.infer<typeof UserResponse>
```

## Why

Co-location makes ownership clear: a route and its schemas change together. Domain types are derived with `z.infer`, so the domain layer depends on TypeScript types only. In a project that mixes versions during a migration, keep each module's `zod` import on one version: a `z.infer` from `zod/v3` applied to a schema built with `zod/v4` does not type-check.
