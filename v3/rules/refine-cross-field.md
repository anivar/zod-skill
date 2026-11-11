---
title: "Cross-Field Validation (Zod 3)"
impact: HIGH
description: Refine the parent object and set path to the field that shows the error. In Zod 3 the parameter is message, and there is no `when`.
tags: refinement, cross-field, path, zod3
---

# Cross-Field Validation (Zod 3)

Zod 4 form: `rules/refine-cross-field.md`.

## Problem

A refinement on one field sees only that field. A rule that compares two fields belongs on the object, with `path` set so the issue lands on the right field. Zod 3 spells the message as `message`; Zod 4's `error` and `when` keys are not Zod 3 parameters.

## Incorrect

```typescript
// BUG: the refinement on confirm cannot see password
const Form = z.object({
  password: z.string().min(8),
  confirm: z.string().refine((val) => val.length > 0, { message: "Passwords don't match" }),
})

const WithWhen = z
  .object({ password: z.string(), confirm: z.string() })
  // @ts-expect-error `when` is not a Zod 3 refinement parameter
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", when: () => true })
```

## Correct

```typescript
// GOOD: refine the object, and put the issue on confirm
const Form = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })

// Several issues: .superRefine() with a path on each
const DateRange = z
  .object({ start: z.date(), end: z.date(), label: z.string() })
  .superRefine((data, ctx) => {
    if (data.end < data.start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end"], message: "End is before start" })
    }
    if (data.label.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["label"], message: "Label is empty" })
    }
  })
```

## Why

`path` puts the issue under the field, so `error.flatten().fieldErrors.confirm` holds it and a form library shows it next to that input. The object refinement runs after a failed check on a field, so both issues are reported, and is skipped when a field has a type error (V16); Zod 4 behaves the same and adds `when` to run it earlier.
