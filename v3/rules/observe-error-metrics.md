---
title: "Track Validation Error Rates per Schema and Field (Zod 3)"
impact: MEDIUM
description: Wrap safeParse in a tracked helper in Zod 3 too. Constrain the schema with z.ZodTypeAny and type the result as z.SafeParseReturnType<z.input<T>, z.output<T>>.
tags: observability, metrics, safeParse, zod3
---

# Track Validation Error Rates per Schema and Field (Zod 3)

Zod 4 form: `rules/observe-error-metrics.md`. The rule is the same; the generic names differ.

## Problem

Without counters per schema and field, a too-strict schema rejects valid input unseen and a too-loose one never fails. The Zod 4 helper is typed with `z.ZodType` and `z.ZodSafeParseResult`; Zod 3 spells those `z.ZodTypeAny` and `z.SafeParseReturnType<Input, Output>`.

## Incorrect

```typescript
const OrderSchema = z.object({ sku: z.string(), quantity: z.number().int().positive() })

// No monitoring — validation is a black box
app.post("/api/orders", (req, res) => {
  const result = OrderSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: "Invalid" })
  }
})
```

## Correct

```typescript
import * as z from "zod"

const OrderSchema = z.object({ sku: z.string(), quantity: z.number().int().positive() })

function trackedSafeParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  schemaName: string
): z.SafeParseReturnType<z.input<T>, z.output<T>> {
  const result = schema.safeParse(data)

  metrics.increment("zod.validation.attempt", { schema: schemaName })

  if (!result.success) {
    metrics.increment("zod.validation.failure", { schema: schemaName })
    const flat = result.error.flatten()
    for (const field of Object.keys(flat.fieldErrors)) {
      metrics.increment("zod.validation.field_error", { schema: schemaName, field })
    }
  }

  return result
}

app.post("/api/orders", (req, res) => {
  const result = trackedSafeParse(OrderSchema, req.body, "OrderSchema")
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors })
  }
  res.json({ accepted: result.data.quantity })
})
```

## Why

`z.ZodTypeAny` is Zod 3's "any schema" bound; the migration guide replaces it with `z.ZodType` in Zod 4. `z.SafeParseReturnType<Input, Output>` names the result so callers keep the discriminated union. The metrics read the same in both versions: attempts, failures, and failures per field from the flattened errors.
