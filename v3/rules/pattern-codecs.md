---
title: "One Schema per Direction (Zod 3)"
impact: MEDIUM
description: Zod 3 has no z.codec(). Write a decode schema and an encode schema as a pair, and keep them next to each other so they stay inverse.
tags: codec, transform, serialization, zod3
---

# One Schema per Direction (Zod 3)

Zod 4 form: `rules/pattern-codecs.md`.

## Problem

`.transform()` is one-way. Zod 4 adds `z.codec()` with `decode` and `encode`. Zod 3 has no codec and no `.encode()`, so the two directions are two schemas.

## Incorrect

```typescript
// BAD: parsing works, and nothing converts back for the API response
const DateField = z.string().datetime().transform((s) => new Date(s))

// @ts-expect-error z.codec() does not exist in Zod 3
const Codec = z.codec(z.string(), z.date(), { decode: (s: string) => new Date(s), encode: (d: Date) => d.toISOString() })
```

## Correct

```typescript
// GOOD: a pair, declared together
const DateFromIso = z.string().datetime().transform((s) => new Date(s))
const IsoFromDate = z.date().transform((d) => d.toISOString())

const parsed = DateFromIso.parse("2024-01-01T00:00:00Z") // Date
const serialized = IsoFromDate.parse(parsed) // "2024-01-01T00:00:00.000Z"

// A round trip through both halves is the test that keeps them inverse
const roundTrip = (iso: string) => IsoFromDate.parse(DateFromIso.parse(iso))
```

## Why

Each half validates its own input: `DateFromIso` rejects a bad ISO string, `IsoFromDate` rejects a non-`Date`. Declaring them side by side, and testing the round trip, is what `z.codec()` gives for free in Zod 4. When the file moves to `zod/v4`, the pair collapses into one `z.codec(z.iso.datetime(), z.date(), { decode, encode })`.
