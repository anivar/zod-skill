---
title: "v4: Unified z.enum()"
impact: MEDIUM
description: Pass TypeScript enums to z.enum(). z.nativeEnum() still runs but is deprecated.
tags: migration, v4, enum, nativeEnum
---

# v4: Unified z.enum()

## Problem

Zod 3 had `z.enum()` for string arrays and `z.nativeEnum()` for TypeScript enums. In Zod 4, `z.enum()` takes both. `z.nativeEnum()` still runs, and its type definition marks it deprecated.

## Incorrect

```typescript
enum Role {
  Admin = "admin",
  User = "user",
}

const RoleSchema = z.nativeEnum(Role) // deprecated: use z.enum(Role)
```

## Correct

```typescript
enum Role {
  Admin = "admin",
  User = "user",
}

const RoleSchema = z.enum(Role)

// a string array, written inline or `as const` so the values stay literal types
const StatusSchema = z.enum(["active", "inactive", "pending"])

// .enum gives the enum-like object; .exclude() and .extract() derive new schemas
StatusSchema.enum.active // "active"
const Open = StatusSchema.exclude(["inactive"])
```

## Why

`z.enum()` accepts a string array, a TypeScript enum, or an enum-like object (zod.dev/api, "Enums"). Since Zod 4.6, `.options` of a numeric enum lists only the values: `z.enum(Country).options` for `enum Country { UK, Germany }` is `[0, 1]`, without the reverse-mapping keys. `.Enum` and `.Values` from Zod 3 are removed; use `.enum`.
