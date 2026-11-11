---
title: "TypeScript Enums Use z.nativeEnum() (Zod 3)"
impact: MEDIUM
description: In a Zod 3 file pass a TypeScript enum to z.nativeEnum(). z.enum() takes a string array only; z.enum(TSEnum) fails to compile and throws at runtime.
tags: migration, enum, nativeEnum, zod3
---

# TypeScript Enums Use z.nativeEnum() (Zod 3)

Zod 4 form: `rules/migrate-native-enum.md`, whose "Incorrect" block is the correct Zod 3 code.

## Problem

Zod 4 overloads `z.enum()` to take a TypeScript enum and deprecates `z.nativeEnum()`. In Zod 3 `z.enum()` takes a string array only. Passing an enum object fails to compile; in JavaScript the schema builds and the first parse throws a `TypeError` (V14).

## Incorrect

```typescript
enum Role {
  Admin = "admin",
  User = "user",
}

// @ts-expect-error z.enum() takes a string array in Zod 3; in JavaScript the first parse throws TypeError
const RoleSchema = z.enum(Role)
```

## Correct

```typescript
enum Role {
  Admin = "admin",
  User = "user",
}

const RoleSchema = z.nativeEnum(Role)

// a string array, inline or `as const`
const StatusSchema = z.enum(["active", "inactive", "pending"])

// .enum, .Enum and .Values all give the enum-like object in Zod 3; .enum is the one Zod 4 keeps
StatusSchema.enum.active // "active"
const Open = StatusSchema.exclude(["inactive"])
```

## Why

`z.nativeEnum()` reads the enum's values, string or numeric, and infers the enum type. It keeps working after a move to `zod/v4` as a deprecated function. Read `.enum` rather than `.Enum` or `.Values`: the migration guide removes the last two, and `.enum` is identical in Zod 3.
