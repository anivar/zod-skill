---
title: Parse a JSON String with a Codec, Not z.json()
impact: HIGH
description: z.json() checks a value that is already parsed and does not parse a string; decode JSON text with a codec that reports bad JSON as an issue.
tags: json, codec, parsing, request-body
---

# Parse a JSON String with a Codec, Not z.json()

## Problem

`z.json()` checks that a value can be encoded as JSON. A string can be, so `z.json().parse('{"name":"Ada"}')` returns the same string. Code that gives JSON text to `z.json()` gets a string where it expects an object. `JSON.parse()` inside `.transform()` is no better: on bad text it throws a `SyntaxError`, and the error escapes `safeParse()`.

## Incorrect

```typescript
const Body = z.object({ name: z.string() })

// BUG: the result is the string '{"name":"Ada"}', not an object
const notParsed = z.json().parse('{"name":"Ada"}')

// BUG: on "{bad", JSON.parse throws out of safeParse() instead of returning success: false
const FromText = z.string().transform((s) => JSON.parse(s)).pipe(Body)
```

## Correct

```typescript
const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (text, ctx) => {
      try {
        return JSON.parse(text)
      } catch (err) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: text,
          message: err instanceof Error ? err.message : "Invalid JSON",
        })
        return z.NEVER
      }
    },
    encode: (value) => JSON.stringify(value),
  })

const BodyFromText = jsonCodec(Body)
BodyFromText.decode('{"name":"Ada"}')     // { name: "Ada" }
BodyFromText.safeDecode("{bad").success  // false: an invalid_format issue with format "json"
BodyFromText.encode({ name: "Ada" })      // '{"name":"Ada"}'
```

## Why

Use `z.json()` for a value that is already parsed, such as a JSON column or a field typed as arbitrary JSON. For JSON text, the codec turns bad text into an issue, validates the result with your schema, and encodes the value back. Zod does not export the codec; it is a recipe from zod.dev/codecs. See `references/codecs.md` for the other recipes.
