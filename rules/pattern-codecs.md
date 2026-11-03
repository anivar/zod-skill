---
title: Codecs for Bidirectional Transforms
impact: MEDIUM
description: Use z.codec() for bidirectional transforms (e.g., ISO string ↔ Date). .transform() is one-way.
tags: codec, encode, decode, serialization
---

# Codecs for Bidirectional Transforms

## Problem

`.transform()` is one-directional — it converts input to output during parsing. But when you need to serialize data back (e.g., Date → ISO string for an API response), a one-way transform loses the encode direction.

## Incorrect

```typescript
// BAD: transform is one-way — can't serialize back to ISO string
const DateField = z.string().transform((s) => new Date(s))

// Parsing works: "2024-01-01" → Date object
// But how do you convert back to "2024-01-01" for the API?
```

## Correct

```typescript
// GOOD: codec defines both directions
const DateField = z.codec(z.iso.datetime(), z.date(), {
  decode: (s) => new Date(s), // string → Date (parsing)
  encode: (d) => d.toISOString(), // Date → string (serialization)
})

const parsed = DateField.parse("2024-01-01T00:00:00Z") // Date object
const serialized = DateField.encode(parsed) // "2024-01-01T00:00:00.000Z"
```

## Why

Codecs define a `decode` (parse direction) and `encode` (serialize direction) pair, for values that round-trip between representations: API input and output, database rows, form values. `.parse()` takes `unknown`; `.decode()` and `.encode()` take typed input, so TypeScript catches a wrong argument. Calling `.encode()` on a schema that contains a `.transform()` throws `$ZodEncodeError`, a plain error rather than a `ZodError`. Defaults, prefaults and `.catch()` apply only when decoding. The zod.dev codecs page has copy-in recipes such as `stringToInt`, `epochSecondsToDate` and `jsonCodec`; Zod does not export them.

| | `.transform()` | `z.codec()` |
|---|---|---|
| Direction | One-way (input → output) | Bidirectional (decode + encode) |
| Use when | Only parsing (API input) | Round-trip (API input ↔ output) |
| Encoding | Throws `$ZodEncodeError` | `schema.encode(value)` |
