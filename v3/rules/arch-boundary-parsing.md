---
title: "Parse at System Boundaries, Not in Domain Logic (Zod 3)"
impact: CRITICAL
description: Call safeParse() at entry points in Zod 3 too, flatten the error with error.flatten(), and pass typed data inward. Domain logic receives typed values, not unknown.
tags: architecture, boundary, safeParse, zod3
---

# Parse at System Boundaries, Not in Domain Logic (Zod 3)

Zod 4 form: `rules/arch-boundary-parsing.md`. The rule is the same; the error is flattened with a method.

## Problem

`safeParse()` calls scattered through domain logic make every function handle `unknown` input and validation errors, and the same payload is parsed more than once.

## Incorrect

```typescript
const OrderSchema = z.object({ id: z.string(), total: z.number().nonnegative() })

// BUG: domain logic handles unknown input and parsing
function calculateDiscount(data: unknown) {
  const result = OrderSchema.safeParse(data)
  if (!result.success) {
    throw new Error("Invalid order")
  }
  return result.data.total > 100 ? result.data.total * 0.1 : 0
}

// BUG: the service layer re-parses what was already validated
function processOrder(data: unknown) {
  const result = OrderSchema.safeParse(data)
  if (!result.success) return { error: "Invalid" }
  const discount = calculateDiscount(data) // parses again
  return { total: result.data.total - discount }
}
```

## Correct

```typescript
// Parse ONCE at the boundary
app.post("/orders", (req, res) => {
  const result = OrderSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors })
  }
  res.json(processOrder(result.data))
})

// Domain logic receives typed data
function calculateDiscount(order: Order): number {
  return order.total > 100 ? order.total * 0.1 : 0
}

function processOrder(order: Order) {
  const discount = calculateDiscount(order)
  return { total: order.total - discount }
}

type Order = z.infer<typeof OrderSchema>
```

## Decision Table: Where to Parse

| Boundary | Where to call safeParse() |
|----------|--------------------------|
| Express/Fastify route | In the route handler, before calling service functions |
| tRPC | `.input(Schema)` — the framework parses for you |
| Next.js Server Action | At the top of the action function |
| React Hook Form | `zodResolver(Schema)` — the resolver parses on submit |
| Environment variables | At app startup |
| External API response | Right after `fetch()`, before using the data |
| Message queue consumer | At the top of the handler |

## Why

Parsing at the boundary keeps domain functions pure: typed values in, typed values out. `result.error.flatten()` is the Zod 3 spelling of the Zod 4 `z.flattenError(result.error)`; the `fieldErrors` shape is the same.
