# Parsing and Type Inference Reference

Docs: zod.dev/basics, zod.dev/api · Zod 4.6.7

## Parsing Methods

### parse(data)

Parses input and returns the validated data. Throws `ZodError` on failure.

```typescript
const UserSchema = z.object({ name: z.string(), email: z.email() })

const result = UserSchema.parse(data) // returns the parsed value or throws
```

Use when invalid data is truly exceptional (internal config, constants).

### safeParse(data)

Returns a discriminated union — never throws.

```typescript
const result = UserSchema.safeParse(data)
if (result.success) {
  result.data // { name: string; email: string }
} else {
  result.error // ZodError
}
```

Preferred for all user input, API boundaries, form data.

### parseAsync(data)

Required when schema contains async refinements or transforms. Throws on failure.

```typescript
const result = await UserSchema.parseAsync(data)
```

### safeParseAsync(data)

Async version of safeParse. Required for async refinements/transforms.

```typescript
const result = await UserSchema.safeParseAsync(data)
if (result.success) {
  result.data
} else {
  result.error
}
```

### validate(data)

Zod 4.6. Returns a boolean and builds no error. It stops at the first failure and narrows `data` to the schema's input type. The zod.dev basics page measures it as up to 16x faster than `.safeParse().success` on invalid input. Zod Mini uses the top-level form, `z.validate(schema, data)`.

```typescript
if (UserSchema.validate(data)) {
  data.email // typed
}
```

Use `.validateAsync()` for async refinements and transforms.

### When to Use Which

| Method | Throws | Async | Use When |
|--------|--------|-------|----------|
| `parse()` | Yes | No | Internal data, config — invalid = bug |
| `safeParse()` | No | No | User input, API — invalid = expected |
| `parseAsync()` | Yes | Yes | Async refinements, internal data |
| `safeParseAsync()` | No | Yes | Async refinements, user input |
| `validate()` | No | No | Only a yes or no is needed; large untrusted input |
| `validateAsync()` | No | Yes | The same, with async refinements |
| `decode()` / `encode()` | Yes | No | Codecs: typed input, both directions (`safeDecode`, `decodeAsync` and so on also exist) |

`.safeParse()` reports every issue, so its work grows with the input: a million invalid array elements produce a million issues. Bound such input with `.max()` or a body-size limit, or use `.validate()`.

## Type Inference

### z.infer<typeof Schema>

Extracts the **output** type (after transforms).

```typescript
const UserSchema = z.object({
  name: z.string(),
  createdAt: z.string().transform((s) => new Date(s)),
})

type User = z.infer<typeof UserSchema>
// { name: string; createdAt: Date }
```

### z.input<typeof Schema>

Extracts the **input** type (before transforms).

```typescript
type UserInput = z.input<typeof UserSchema>
// { name: string; createdAt: string }
```

Useful for form state, request bodies, or any context where you work with pre-transform data.

### z.output<typeof Schema>

Alias for `z.infer`. Extracts the output type.

```typescript
type User = z.output<typeof UserSchema>
// Same as z.infer<typeof UserSchema>
```

### Input vs Output Examples

```typescript
const FormSchema = z.object({
  age: z.string().pipe(z.coerce.number()),        // string → number
  active: z.stringbool(),                          // string → boolean
  date: z.string().transform((s) => new Date(s)), // string → Date
})

type FormInput = z.input<typeof FormSchema>
// { age: string; active: string; date: string }

type FormOutput = z.infer<typeof FormSchema>
// { age: number; active: boolean; date: Date }
```

## Coercion Namespace

Coercion schemas apply JavaScript constructors before validation. Their input type is `unknown`; narrow it with a type argument, e.g. `z.coerce.number<string>()`.

```typescript
z.coerce.string()   // String(input) → then validate as string
z.coerce.number()   // Number(input) → then validate as number
z.coerce.boolean()  // Boolean(input) → then validate as boolean
z.coerce.bigint()   // BigInt(input) → then validate as bigint
z.coerce.date()     // new Date(input) → then validate as date
```

### Coercion Pitfall: Boolean

```typescript
z.coerce.boolean().parse("false") // true — Boolean("false") is true
z.coerce.boolean().parse("")      // false — Boolean("") is false
z.coerce.boolean().parse("0")     // true — Boolean("0") is true

// Use z.stringbool() for string→boolean from forms/env vars
z.stringbool().parse("false") // false
z.stringbool().parse("0")     // false
```

## Parse Options

```typescript
const schema = z.object({ password: z.string().min(12) })

// reportInput — includes raw input in error issues
schema.safeParse(data, { reportInput: true })
// error.issues[0].input will contain the raw value

// Only use in development — leaks sensitive data in production
schema.safeParse(data, {
  reportInput: process.env.NODE_ENV === "development",
})
```

## Standard Schema

Zod schemas implement Standard Schema, so a library that accepts a `StandardSchemaV1` accepts a Zod schema without an adapter.

```typescript
import type { StandardSchemaV1 } from "@standard-schema/spec"

function check(schema: StandardSchemaV1, value: unknown) {
  return schema["~standard"].validate(value)
}

check(z.object({ name: z.string() }), { name: "Ada" })
```
