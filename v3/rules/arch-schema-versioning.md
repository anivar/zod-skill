---
title: "Evolve Schemas Without Breaking Consumers (Zod 3)"
impact: MEDIUM
description: Use additive changes for non-breaking evolution in Zod 3 too. New fields use .optional(); never remove a required field without a major version bump.
tags: architecture, versioning, compatibility, zod3
---

# Evolve Schemas Without Breaking Consumers (Zod 3)

Zod 4 form: `rules/arch-schema-versioning.md`. The rule is the same; the email format is the Zod 3 method.

## Problem

Removing or tightening a field breaks consumers silently: `z.object()` strips unknown keys by default, so a removed field vanishes from the parsed output and consumers read `undefined` with no compile error until they update their types.

## Incorrect

```typescript
// v1 — consumers depend on `role`
const UserV1 = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  nickname: z.string(),
})

// v2 — BREAKING: `role` removed; consumers get undefined
const UserV2 = z.object({
  name: z.string(),
  email: z.string().email(),
  nickname: z.string(),
})
```

## Correct

```typescript
// v2 — non-breaking: keep role, add displayName as optional, deprecate nickname
const UserV2 = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]), // kept
  nickname: z.string(), // kept; deprecate in docs, remove in v3
  displayName: z.string().optional(), // new — optional so old payloads still parse
})

type UserV2 = z.infer<typeof UserV2>
```

## Decision Table: Schema Changes

| Change | Breaking? | Safe Approach |
|--------|-----------|---------------|
| Add optional field | No | `.optional()` — old data still parses |
| Add required field | **Yes** | Make optional first, require in the next major |
| Remove field | **Yes** | Deprecate first, remove in the next major |
| Tighten constraint | **Yes** | Previously valid data now fails |
| Loosen constraint | No | Existing data still valid |
| Rename field | **Yes** | Add the new name as optional, keep the old, migrate |
| Change type | **Yes** | New field with a new name, deprecate the old |
| Add union member | No | Existing data still matches |
| Remove union member | **Yes** | Existing data with that value fails |

## Why

A schema is a runtime contract, and changing it has the same effect as changing an API. Additive changes are safe; subtractive ones need a coordinated migration. One Zod 3 point to remember here: `.default()` on a new field parses the default value (V9), so a default that fails the field's own checks breaks every old payload at once.
