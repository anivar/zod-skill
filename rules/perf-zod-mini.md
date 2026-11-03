---
title: Zod Mini Only Under Strict Bundle Limits
impact: MEDIUM
description: Use Zod Mini only for client bundles with strict size limits; import it from zod/mini and load a locale.
tags: bundle-size, mini, client, tree-shaking, locale
---

# Zod Mini Only Under Strict Bundle Limits

## Problem

Zod Mini has the same features as Zod behind a functional API that bundlers can tree-shake. The saving is a few kilobytes, and the API is harder to discover. The zod.dev Zod Mini page recommends regular Zod unless bundle size is an uncommonly strict constraint, and says the saving does not matter on a server. Zod Mini also loads no locale, so every message reads "Invalid input" until you load one.

## Incorrect

```typescript
// BAD: Zod Mini on a server, where a few kilobytes do not matter
import * as z from "zod/mini"

const Order = z.object({
  sku: z.string().check(z.minLength(1)),
  quantity: z.int().check(z.positive()),
})
// and with no locale loaded, every issue message is "Invalid input"
```

## Correct

```typescript
// GOOD: a size-constrained client bundle that shows messages to users
import * as z from "zod/mini"
import { en } from "zod/locales"

z.config(en())

const LoginForm = z.object({
  email: z.email(),
  password: z.string().check(z.minLength(8)),
})
```

## Why

Measured by the zod.dev Zod Mini page (gzip): `z.boolean().parse(true)` bundles to 2.12 kB with Zod Mini and 5.91 kB with Zod; a three-key object schema bundles to 4.0 kB and 13.1 kB.

| | Zod | Zod Mini |
|---|---|---|
| Import | `import * as z from "zod"` | `import * as z from "zod/mini"`, or the `@zod/mini` package, which tracks `zod` versions |
| Checks | Methods: `.min(8)`, `.trim()`, `.refine()` | `.check(z.minLength(8), z.trim(), z.refine(...))` |
| Wrappers | `.optional()`, `.nullable()` | `z.optional(s)`, `z.nullable(s)` |
| Error messages | English locale loaded | None loaded: "Invalid input" until `z.config(en())` |
| JSON Schema, metadata | `z.toJSONSchema()`, `.meta()`, `.describe()` | `z.toJSONSchema()`; `z.meta()` and `z.describe()` are checks |
| Cyclic input to recursive schemas | Works | Needs a registered memoizer |
| Use when | Servers, scripts, most front ends | Client bundles with a strict size budget |

A library that must accept both Zod and Zod Mini schemas builds against `zod/v4/core` (zod.dev/library-authors).
