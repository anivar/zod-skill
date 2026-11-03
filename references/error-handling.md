# Error Handling Reference

Docs: zod.dev/error-customization, zod.dev/error-formatting · Zod 4.6.7

## ZodError

```typescript
const Signup = z.object({
  email: z.email(),
  age: z.int().positive(),
  address: z.object({ zip: z.string().length(5) }),
})

const result = Signup.safeParse(data)
if (!result.success) {
  result.error            // ZodError instance
  result.error.issues     // array of issues
  result.error.message    // the issues as pretty-printed JSON
  result.error.toString() // same as .message
}
```

`ZodError.errors` from Zod 3 is gone; read `.issues`. A `ZodError` from the `zod` package is an `Error`. The `$ZodError` class in `zod/v4/core` does not extend `Error`.

## Issue Structure

```typescript
// Every issue has these fields; each code adds its own (see the table)
type IssueBase = {
  code: string        // issue type code
  message: string     // human-readable message
  path: PropertyKey[] // path to the field
  input?: unknown     // raw input, only with reportInput: true
}
```

## Issue Codes

| Code | When | Extra Fields |
|------|------|-------------|
| `invalid_type` | Wrong type, missing required key, invalid `Date` | `expected` |
| `too_small` | Below minimum | `origin`, `minimum`, `inclusive`, `exact` |
| `too_big` | Above maximum | `origin`, `maximum`, `inclusive`, `exact` |
| `invalid_format` | String format or regex failure | `format`, `pattern` |
| `not_multiple_of` | `.multipleOf()` failure | `divisor` |
| `unrecognized_keys` | Unknown keys (strict) | `keys` |
| `invalid_union` | No branch matched | `errors` (one issue array per branch) |
| `invalid_key` / `invalid_element` | Record or map key, map or set element | `origin`, `issues` |
| `invalid_value` | Not an allowed literal or enum value | `values` |
| `custom` | Custom refinement | `params`, when given |

Zod 3's `received` field on `invalid_type`, and the codes `invalid_string`, `invalid_enum_value`, `invalid_literal`, `invalid_date`, `invalid_arguments` and `invalid_return_type`, are gone. A `z.function()` implementation throws a core `$ZodError` on bad arguments or a bad return value; on 4.6.7 `instanceof z.ZodError` is false for it.

## Error Formatting Functions

### z.flattenError(error)

Flat structure for one-level forms. Issues from nested fields land under their top-level key.

```typescript
if (!result.success) {
  const flat = z.flattenError(result.error)
  // {
  //   formErrors: [],
  //   fieldErrors: {
  //     email: ["Invalid email address"],
  //     address: ["Too small: expected string to have exactly 5 characters"],
  //   }
  // }
}
```

### z.treeifyError(error)

Nested tree matching schema shape. For nested forms, arrays and recursive schemas.

```typescript
if (!result.success) {
  const tree = z.treeifyError(result.error)
  // {
  //   errors: [],
  //   properties: {
  //     address: {
  //       errors: [],
  //       properties: { zip: { errors: ["Too small: expected string to have exactly 5 characters"] } }
  //     }
  //   }
  // }

  tree.properties?.address?.properties?.zip?.errors // optional chaining: absent keys are undefined
}
```

### z.prettifyError(error)

A multi-line string for logs and CLIs.

```typescript
if (!result.success) {
  const pretty = z.prettifyError(result.error)
  // ✖ Invalid email address
  //   → at email
  // ✖ Too small: expected string to have exactly 5 characters
  //   → at address.zip
}
```

### z.formatError() — Deprecated

The docs mark `z.formatError()`, `error.format()` and `error.flatten()` deprecated. They still run. Use `z.treeifyError()` or `z.flattenError()`.

## Error Customization

### Schema Level

```typescript
// String shorthand
z.string({ error: "Must be a string" })
z.string("Must be a string")
z.number().min(18, { error: "Must be 18+" })
z.number().min(18, "Must be 18+") // shorthand

// Function form — dynamic messages; return undefined to fall through
z.string({
  error: (issue) => {
    if (issue.input === undefined) return "Required"
    return "Must be a string"
  },
})
```

### Parse Level

```typescript
Signup.safeParse(data, {
  error: (issue) => `Validation failed: ${issue.code}`,
})
```

### Global Level

```typescript
z.config({
  customError: (issue) => {
    if (issue.code === "invalid_type") {
      return `Expected ${issue.expected}`
    }
    if (issue.code === "too_small") {
      return `Minimum is ${issue.minimum}`
    }
    return undefined // use the locale's message
  },
})
```

## Error Precedence

From highest to lowest (zod.dev/error-customization, "Error precedence"):

1. **Check level**: the error on the check that failed, e.g. `.min(5, "Too short")`
2. **Schema level**: the error on the schema, e.g. `z.string("Invalid name")`. It also covers issues from the schema's own checks that have no error of their own
3. **Parse level**: `error` passed to `.parse()` or `.safeParse()`
4. **Global**: `z.config({ customError })`
5. **Locale**: `z.config(en())`; regular Zod loads `en` automatically

## reportInput Option

Includes raw input values in error issues. Zod leaves input out by default. **Never use in production.**

```typescript
// Development only
const debugResult = Signup.safeParse(data, { reportInput: true })
if (!debugResult.success) {
  debugResult.error.issues[0].input // contains the raw value
}
```

Leaks passwords, tokens, PII into logs and error monitoring.

## i18n / Localization

Zod ships locales. Regular Zod loads English; Zod Mini loads none, so every message reads "Invalid input" until you load one.

```typescript
import * as z from "zod"
import { de } from "zod/locales"

z.config(de())
```

For your own translations, use the error function form:

```typescript
type Translate = (key: string, values?: Record<string, unknown>) => string
declare const t: Translate

const NameSchema = z.string({
  error: (issue) => (issue.input === undefined ? t("field.required") : t("field.invalid")),
}).min(1, { error: t("field.too_short") })

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type": return t("validation.invalid_type")
      case "too_small": return t("validation.too_small", { min: issue.minimum })
      default: return undefined
    }
  },
})
```
