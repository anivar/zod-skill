---
title: Cross-Field Validation
impact: HIGH
description: Refine the parent object and set path to the field that shows the error.
tags: refine, superRefine, cross-field, password, confirm, path, when
---

# Cross-Field Validation

## Problem

A refinement on one field sees only that field's value. A rule that compares two fields, such as a password and its confirmation, belongs on the parent object, with `path` set so that the error shows on the right field.

## Incorrect

```typescript
// BUG: the refinement on confirm cannot see password, so it cannot compare them
const Form = z.object({
  password: z.string().min(8),
  confirm: z.string().refine((val) => val.length > 0, {
    error: "Passwords don't match",
  }),
})
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
    error: "Passwords don't match",
    path: ["confirm"],
  })
```

An object refinement does not run when any field has a type error, even a field it does not read. A failed check such as `.min()` does not stop it. Use `when` to run it as soon as the fields it reads are valid:

```typescript
const Base = z.object({
  password: z.string().min(8),
  confirm: z.string(),
  nickname: z.string(),
})

const Signup = Base.refine((data) => data.password === data.confirm, {
  error: "Passwords don't match",
  path: ["confirm"],
  when(payload) {
    return Base.pick({ password: true, confirm: true }).safeParse(payload.value).success
  },
})
```

To report more than one issue, use `.superRefine()` and add each issue with its own `path`:

```typescript
const DateRange = z
  .object({ start: z.date(), end: z.date(), label: z.string() })
  .superRefine((data, ctx) => {
    if (data.end < data.start) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "End is before start", input: data.end })
    }
    if (data.label.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["label"], message: "Label is empty", input: data.label })
    }
  })
```

## Why

`path` puts the issue under the field, so `z.flattenError()` reports it in `fieldErrors.confirm` and a form library shows it next to that input. `.refine()` covers a single condition (zod.dev/api, "Refinements"). The zod.dev page for the `zod` package lists `.superRefine()` as deprecated in favour of `.check()`, but the API page documents it and the 4.6.7 type definitions do not mark it deprecated.
