# Refinements and Transforms Reference

Docs: zod.dev/api · Zod 4.6.7

## .refine(fn, opts)

Custom validation that returns a boolean. The function receives the value only.

```typescript
const EvenNumber = z.number().refine((n) => n % 2 === 0, {
  error: "Must be even",
})

// Async refinement — must use parseAsync/safeParseAsync
const UniqueEmail = z.email().refine(
  async (email) => !(await db.exists(email)),
  { error: "Email taken" }
)
```

Options: `error`, `path` (where the issue goes), `abort` (stop after this check fails), `when` (run only when a condition holds; see `refine-cross-field`).

## .superRefine((val, ctx) => void)

Validation that adds several issues, each with its own path. The `zod` package page lists it as deprecated in favour of `.check()`; the API page documents it and the 4.6.7 types do not mark it deprecated.

```typescript
const Password = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({ code: "custom", message: "Must be at least 8 characters", input: val })
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({ code: "custom", message: "Must contain uppercase letter", input: val })
  }
  if (!/[0-9]/.test(val)) {
    ctx.addIssue({ code: "custom", message: "Must contain a number", input: val })
  }
})
```

### Cross-Field Validation

```typescript
const Form = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm"], // targets the confirm field
        message: "Passwords don't match",
        input: data.confirm,
      })
    }
  })
```

## .check(...checks)

Takes check functions such as `z.minLength()`, or a function that receives `ctx` and pushes issues onto `ctx.issues`. It works in Zod and is the only way to add checks in Zod Mini.

```typescript
z.string().check(
  z.minLength(8, "Too short"),
  z.maxLength(100, "Too long"),
)

z.string().check((ctx) => {
  if (!ctx.value.includes("@")) {
    ctx.issues.push({ code: "custom", message: "Missing @", input: ctx.value })
  }
})
```

In Zod Mini (`import * as z from "zod/mini"`) the same calls work: `z.string().check(z.minLength(8), z.maxLength(100))`.

## .transform(fn)

Converts the value to a new type (one-way).

```typescript
const StringToNumber = z.string().regex(z.regexes.integer).transform(Number)
// Input: string, Output: number

const Trimmed = z.string().transform((s) => s.trim())
// Input: string, Output: string (trimmed)
```

Never throw inside a transform: Zod does not catch the error. To fail, push onto `ctx.issues` and return `z.NEVER` (see `refine-never-throw`). A transform is one-way: `.encode()` on a schema that contains one throws `$ZodEncodeError`. For two-way conversions, use `z.codec()`.

## .pipe(schema)

Staged parsing — output of current schema becomes input of next.

```typescript
const PortNumber = z
  .string()
  .pipe(z.coerce.number())
  .pipe(z.int().min(1).max(65535))

// Stage 1: validate string
// Stage 2: coerce to number
// Stage 3: validate integer in range
```

## z.preprocess(fn, schema)

Runs a function on the raw input, then parses the result with `schema`. A top-level function, not a method. Its input type is `unknown` unless you annotate the function's parameter.

```typescript
const TrimmedString = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z.string().min(1)
)

// annotate the parameter to set the input type, e.g. for react-hook-form
const Trimmed = z.preprocess((val: string | null | undefined) => val?.trim() ?? "", z.string())
type TrimmedInput = z.input<typeof Trimmed> // string | null | undefined
```

## .overwrite(fn)

Changes the value without changing its type, and returns the same schema class, so other methods stay available. `.trim()`, `.toLowerCase()` and `.toUpperCase()` are built on it.

```typescript
const NormalizedEmail = z.email().overwrite((email) => email.toLowerCase())
NormalizedEmail.parse("A@B.CO") // "a@b.co"
```

## .default(value)

When the input is `undefined`, returns the default and skips parsing. The default is not validated, and must match the output type.

```typescript
const Port = z.number().default(3000)
Port.parse(undefined) // 3000
Port.parse(8080)      // 8080

z.string().min(5).default("ab").parse(undefined) // "ab": min(5) does not run
```

Input type becomes optional:
```typescript
type Input = z.input<typeof Port>   // number | undefined
type Output = z.infer<typeof Port>  // number
```

## .prefault(value)

When the input is `undefined`, parses the prefault value instead. It must match the input type, and it goes through every check and transform.

```typescript
const Name = z.string().min(1).prefault("Anonymous")
Name.parse(undefined) // "Anonymous" (validated against min(1))

const Length = z.string().transform((s) => s.length).prefault("tuna")
Length.parse(undefined) // 4
```

## .catch(value)

Returns a fallback value when parsing fails. Pass a function to compute it; the function receives `ctx.error`.

```typescript
const SafeNumber = z.number().catch(0)
SafeNumber.parse("not a number") // 0
SafeNumber.parse(42)             // 42
```

## .apply(fn, ...args)

Calls a function with the schema and returns its result, so a shared helper fits in a method chain. Extra arguments go to the function.

```typescript
function percentage<T extends z.ZodNumber>(schema: T) {
  return schema.min(0).max(100)
}

const Score = z.number().apply(percentage).nullable()
```

## Async Refinements and Transforms

When any refinement or transform is async, you must use `parseAsync()` or `safeParseAsync()`. The sync methods throw `$ZodAsyncError`.

```typescript
const Schema = z.object({
  email: z.email().refine(
    async (email) => !(await db.exists(email)),
    { error: "Taken" }
  ),
  avatar: z.url().transform(async (url) => {
    const res = await fetch(url)
    return res.blob()
  }),
})

// REQUIRED: async parse
const result = await Schema.safeParseAsync(data)
```

## Issue Codes

The codes Zod 4 reports. Use `"custom"` in `ctx.addIssue()` and `ctx.issues.push()`.

| Code | Raised when |
|------|-------------|
| `"custom"` | A refinement or custom check fails |
| `"invalid_type"` | Wrong input type, including an invalid `Date` and a missing required key |
| `"too_small"` / `"too_big"` | Below a minimum or above a maximum (length, value, size) |
| `"invalid_format"` | A string format or pattern fails (`format` names it: `"email"`, `"regex"`, ...) |
| `"not_multiple_of"` | `.multipleOf()` fails |
| `"unrecognized_keys"` | Unknown keys in a strict object |
| `"invalid_union"` | No union branch matched; `errors` holds each branch's issues |
| `"invalid_key"` / `"invalid_element"` | Wraps the issues of a failing record or map key, or map or set element, in `issues`. On 4.6.7 a record key that fails its pattern gives `invalid_key`; map keys and set elements report the inner code |
| `"invalid_value"` | Not one of the allowed literal or enum values |

Zod 3's `invalid_string`, `invalid_enum_value`, `invalid_literal`, `invalid_date`, `invalid_arguments` and `invalid_return_type` are gone (zod.dev/v4/changelog).
