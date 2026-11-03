# Zod Anti-Patterns

Docs: zod.dev/api, zod.dev/v4/changelog · Zod 4.6.7

## Table of Contents

- Using parse() with try/catch instead of safeParse()
- Sync parse with async refinements
- Manual type definitions alongside schemas
- Deprecated string format methods
- Using z.nativeEnum()
- Using required_error, invalid_type_error and message
- Using z.formatError()
- Throwing inside refinements or transforms
- z.coerce.boolean() for string booleans
- Assuming z.object() preserves unknown keys
- z.union() for tagged objects
- reportInput in production
- z.lazy() with a hand-written type for recursive schemas
- Duplicating field definitions
- Hand-rolling what Zod 4 does natively

## Using parse() with try/catch instead of safeParse()

```typescript
const UserSchema = z.object({ name: z.string(), email: z.email() })

// BAD: verbose, catches unrelated errors
function readUserThrowing(data: unknown) {
  try {
    const user = UserSchema.parse(data)
    return { success: true, data: user }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, errors: e.issues }
    }
    throw e
  }
}

// GOOD: discriminated result
function readUser(data: unknown) {
  const result = UserSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error.issues }
}
```

## Sync parse with async refinements

```typescript
// BAD: throws $ZodAsyncError because the refinement is async
const Schema = z.email().refine(async (e) => !(await db.exists(e)))
Schema.safeParse(data) // throws

// GOOD: use safeParseAsync
await Schema.safeParseAsync(data)
```

## Manual type definitions alongside schemas

```typescript
// BAD: types drift from schema
interface UserShape {
  name: string
  email: string
}

const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number(), // added to schema, forgot interface
})
```

```typescript
// GOOD: infer from schema
const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number(),
})

type User = z.infer<typeof UserSchema>
```

## Deprecated string format methods

```typescript
// BAD: the method forms still run, and their types mark them deprecated
z.string().email() // deprecated: use z.email()
z.string().url() // deprecated: use z.url()
z.string().uuid() // deprecated: use z.uuid()

// GOOD: top-level format functions
z.email()
z.url()
z.uuid()
```

## Using z.nativeEnum()

```typescript
enum Status { Active = "active", Inactive = "inactive" }

// BAD: still runs, but deprecated
z.nativeEnum(Status) // deprecated: use z.enum()

// GOOD: unified z.enum()
z.enum(Status)
```

## Using required_error, invalid_type_error and message

```typescript
// BAD: Zod 4 dropped required_error and invalid_type_error; plain JavaScript ignores them
// @ts-expect-error not Zod 4 parameters
z.string({ required_error: "Required", invalid_type_error: "Not a string" })
// still works, but `message` is deprecated
z.number().min(5, { message: "Too small" })

// GOOD: unified error parameter
z.string({ error: (issue) => (issue.input === undefined ? "Required" : "Not a string") })
z.number().min(5, { error: "Too small" })
z.number().min(5, "Too small") // shorthand
```

## Using z.formatError()

```typescript
const result = z.object({ email: z.email() }).safeParse(data)

if (!result.success) {
  // BAD: the docs mark z.formatError() deprecated
  z.formatError(result.error)

  // GOOD: use the right formatter
  z.flattenError(result.error)   // for flat forms
  z.treeifyError(result.error)   // for nested structures
  z.prettifyError(result.error)  // for logging
}
```

## Throwing inside refinements or transforms

```typescript
// BAD: the throw escapes safeParse() as a plain Error
z.number().refine((n) => {
  if (n <= 0) throw new Error("Must be positive")
  return true
})

z.string().transform((val) => {
  const n = Number.parseInt(val, 10)
  if (Number.isNaN(n)) throw new Error("Not a number")
  return n
})

// GOOD: return boolean from refine
z.number().refine((n) => n > 0, { error: "Must be positive" })

// GOOD: check the string, convert it, then check the number
z.string().regex(z.regexes.integer).transform(Number).pipe(z.int().positive())
```

`Number.parseInt("12abc", 10)` is `12`, so a `parseInt` check accepts strings that only start with digits.

## z.coerce.boolean() for string booleans

```typescript
// BAD: Boolean("false") === true
z.coerce.boolean().parse("false") // true
z.coerce.boolean().parse("0")     // true

// GOOD: z.stringbool() handles string booleans correctly
z.stringbool().parse("false") // false
z.stringbool().parse("0")     // false
```

## Assuming z.object() preserves unknown keys

```typescript
// BAD: unknown keys are silently stripped
const payload = { name: "Alice", role: "admin", debug: true }
z.object({ name: z.string() }).parse(payload)
// { name: "Alice" } — role and debug are gone

// GOOD: choose explicitly
z.strictObject({ name: z.string() }) // rejects unknown
z.looseObject({ name: z.string() })  // preserves unknown
```

## z.union() for tagged objects

```typescript
// BAD: tries every branch; a bad tag gives one "Invalid input" issue at the root
z.union([
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), count: z.number() }),
])

// GOOD: picks the branch by the discriminator; issues name the failing field
z.discriminatedUnion("type", [
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), count: z.number() }),
])
```

## reportInput in production

```typescript
const LoginSchema = z.object({ email: z.email(), password: z.string() })

// BAD: leaks sensitive data into error logs
app.post("/login", (req, res) => {
  const result = LoginSchema.safeParse(req.body, { reportInput: true })
  if (!result.success) {
    logger.error(result.error.issues) // may contain passwords
  }
})

// GOOD: development only
app.post("/session", (req, res) => {
  const result = LoginSchema.safeParse(req.body, {
    reportInput: process.env.NODE_ENV === "development",
  })
})
```

## z.lazy() with a hand-written type for recursive schemas

`z.lazy()` is not removed or deprecated. The getter is the documented form for recursive objects: it needs no hand-written type and keeps object methods.

```typescript
// BAD: the interface duplicates the schema
interface TreeShape {
  value: string
  children?: TreeShape[]
}

const Tree: z.ZodType<TreeShape> = z.object({
  value: z.string(),
  children: z.lazy(() => z.array(Tree)).optional(),
})
```

```typescript
// GOOD: getter pattern
const Tree = z.object({
  value: z.string(),
  get children() {
    return z.array(Tree).optional()
  },
})
```

## Duplicating field definitions

```typescript
// BAD: fields duplicated — will drift
const CreateUser = z.object({ name: z.string(), email: z.email() })
const UpdateUser = z.object({ name: z.string().optional(), email: z.email().optional() })
```

```typescript
// GOOD: derive from base
const User = z.object({ name: z.string(), email: z.email() })
const CreateUser = User
const UpdateUser = User.partial()
```

## Hand-rolling what Zod 4 does natively

Working code that a Zod 4 API does better. You maintain the hand-rolled version; Zod maintains the API.

### One-way transforms where the value has to make a round trip

```typescript
// WORKS, but you own the inverse
const DateIn = z.iso.datetime().transform((s) => new Date(s))
const toWire = (d: Date) => d.toISOString()   // and this drifts from the above
```

```typescript
// BETTER: one definition, both directions
const DateField = z.codec(z.iso.datetime(), z.date(), {
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
})
z.decode(DateField, "2024-01-01T00:00:00Z") // Date
z.encode(DateField, new Date())             // string
z.invertCodec(DateField)                    // when the boundary runs the other way
```

The transform pair is where serialisation bugs live: someone changes the parse
side and the write side keeps the old shape. A codec makes that impossible to
express.

### Optional keys that must not be present-and-undefined

```typescript
// WORKS, but accepts { nickname: undefined }
z.object({ nickname: z.string().optional() })

// BETTER when the key must be absent
z.object({ nickname: z.string().exactOptional() })
```

Matters against JSON, which cannot express an explicit `undefined`, and against
TypeScript's `exactOptionalPropertyTypes`.

### Mutually exclusive unions checked by hand

```typescript
const EmailLogin = z.object({ email: z.email() })
const PhoneLogin = z.object({ phone: z.e164() })

// WORKS, but you maintain the exclusivity check
z.union([EmailLogin, PhoneLogin]).refine((v) => !("email" in v && "phone" in v))

// BETTER: fails when more than one branch matches
z.xor([EmailLogin, PhoneLogin])
```

`z.xor()` takes an array, like `z.union()`.

### JSON Schema written or parsed by hand

```typescript
const User = z.object({ name: z.string() })

// BETTER, both directions
z.toJSONSchema(User)      // publish a contract
z.fromJSONSchema({ type: "object", properties: { name: { type: "string" } } }) // experimental
```

Hand-written JSON Schema alongside a Zod schema is two sources of truth that
agree only until someone edits one of them.

### Format checks written as regex

```typescript
// WORKS
z.string().regex(/^[0-9a-f]{64}$/i)

// BETTER — named, and correct per algorithm
z.hash("sha256")
z.guid()
```
