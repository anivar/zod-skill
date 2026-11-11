---
title: "Parse a JSON String with a Reporting Transform (Zod 3)"
impact: HIGH
description: Zod 3 has no z.json() and no codec. Decode JSON text in a transform that reports bad text with ctx.addIssue() and z.NEVER, then pipe into the schema.
tags: schema, json, transform, zod3
---

# Parse a JSON String with a Reporting Transform (Zod 3)

Zod 4 form: `rules/schema-json-string.md`.

## Problem

`JSON.parse()` inside `.transform()` throws a `SyntaxError` on bad text, and the exception escapes `safeParse()`. Zod 4 answers with a codec recipe; Zod 3 has no `z.json()` and no `z.codec()`, so the transform itself must turn bad text into an issue.

## Incorrect

```typescript
const Body = z.object({ name: z.string() })

// BUG: on "{bad", JSON.parse throws out of safeParse() instead of returning success: false
const FromText = z.string().transform((s) => JSON.parse(s)).pipe(Body)

// @ts-expect-error z.json() does not exist in Zod 3
const Json = z.json()
```

## Correct

```typescript
const JsonText = z.string().transform((text, ctx) => {
  try {
    return JSON.parse(text) as unknown
  } catch (err) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: err instanceof Error ? err.message : "Invalid JSON" })
    return z.NEVER
  }
})

const BodyFromText = JsonText.pipe(Body)

BodyFromText.parse('{"name":"Ada"}') // { name: "Ada" }
BodyFromText.safeParse("{bad").success // false: one custom issue, no exception

// The other direction is a plain function
const toText = (body: z.infer<typeof Body>) => JSON.stringify(body)
```

## Why

`ctx.addIssue()` records the failure as a `custom` issue and `z.NEVER` ends the transform, so `safeParse()` returns `{ success: false }` as it does for any other invalid input. `.pipe(Body)` validates the parsed value with the real schema. Encoding back is `JSON.stringify`; there is no `.encode()` to pair with it in Zod 3.
