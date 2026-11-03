# Objects and Composition Reference

Docs: zod.dev/api · Zod 4.6.7

## Object Variants

### z.object() — Strips Unknown Keys

```typescript
const User = z.object({
  name: z.string(),
  email: z.email(),
})

User.parse({ name: "Alice", email: "a@b.com", extra: true })
// { name: "Alice", email: "a@b.com" } — extra is stripped
```

### z.strictObject() — Rejects Unknown Keys

```typescript
const Config = z.strictObject({
  host: z.string(),
  port: z.number(),
})

Config.parse({ host: "localhost", port: 3000, debug: true })
// ZodError: Unrecognized key: "debug"
```

### z.looseObject() — Preserves Unknown Keys

```typescript
const Proxy = z.looseObject({
  id: z.string(),
})

Proxy.parse({ id: "123", extra: true, nested: { a: 1 } })
// { id: "123", extra: true, nested: { a: 1 } }
```

## Object Methods

### .shape

Access the raw shape object for spreading.

```typescript
const User = z.object({ name: z.string(), email: z.email() })
User.shape // { name: ZodString, email: ZodEmail }

// Use for spreading
const Extended = z.object({ ...User.shape, age: z.number() })
```

### .keyof()

Returns a `z.enum()` of the object's keys.

```typescript
const UserKey = User.keyof()
// z.enum(["name", "email"])

UserKey.parse("name")  // "name"
UserKey.parse("age")   // ZodError
```

### .extend()

Add new fields to an object schema.

```typescript
const WithAge = User.extend({ age: z.number() })
```

### .safeExtend()

Like `.extend()`, but an overwritten key must keep a type assignable to the original, so the result still `extends` the original type. Use it to add or narrow keys on an object with refinements, where `.extend()` throws on an overwrite.

```typescript
const Narrowed = User.safeExtend({ name: z.string().min(1) }) // OK: still a string
// User.safeExtend({ name: z.number() }) is a TypeScript error
```

### .pick()

Select specific fields.

```typescript
const NameOnly = User.pick({ name: true })
// z.object({ name: z.string() })
```

### .omit()

Remove specific fields.

```typescript
const NoEmail = User.omit({ email: true })
// z.object({ name: z.string() })
```

### .partial()

Make all fields optional. `.exactPartial()` (Zod 4.5) makes them omittable without accepting an explicit `undefined`. `z.deepPartial(schema)` recurses into nested objects, arrays and unions. `.partial()` and `z.deepPartial()` throw on an object that carries its own refinement.

```typescript
const PartialUser = User.partial()
// { name?: string; email?: string }

// Partial specific fields
const PartialName = User.partial({ name: true })
// { name?: string; email: string }
```

### .required()

Make all fields required.

```typescript
const RequiredUser = PartialUser.required()
```

### .catchall(schema)

Validate unknown keys against a schema.

```typescript
const Config = z.object({ host: z.string() }).catchall(z.string())
// Known keys validated by their schemas, unknown keys must be strings
```

### Optional Keys: `.optional()`, `.exactOptional()`, `.nonoptional()`

`.optional()` accepts a missing key and an explicit `undefined`. `.exactOptional()` accepts a missing key and rejects `undefined`, which matches JSON and `exactOptionalPropertyTypes`. `.nonoptional()` makes a field required again, for example after `.partial()`.

```typescript
const Profile = z.object({ nickname: z.string().exactOptional() })
Profile.safeParse({}).success                      // true
Profile.safeParse({ nickname: undefined }).success // false

const Patch = User.partial()
const PatchWithName = Patch.extend({ name: Patch.shape.name.nonoptional() })
```

### Symbol Keys

A shape can declare a symbol key (Zod 4.5). A `const` symbol infers as `unique symbol`, so the key is required in the inferred type. Undeclared symbol keys are ignored.

```typescript
const TAG = Symbol("tag")
const Tagged = z.object({ name: z.string(), [TAG]: z.number() })
Tagged.safeParse({ name: "alice", [TAG]: 42 }).success // true
Tagged.safeParse({ name: "alice" }).success            // false
```

### .readonly()

The output type becomes `Readonly<T>`, and the parsed value is frozen with `Object.freeze()`.

```typescript
const Config = z.object({ host: z.string(), port: z.number() }).readonly()

type Config = z.infer<typeof Config>
// Readonly<{ host: string; port: number }>
```

### Validate Properties in Place: `.properties()`

`z.object()` returns a new plain object. `.properties()` on `z.instanceof()` (Zod 4.6) checks some properties of the input and returns the input itself, so a class instance keeps its prototype and methods.

```typescript
const OkResponse = z.instanceof(Response).properties({
  ok: z.literal(true),
  status: z.number().min(200).max(299),
})

const res = await fetch("/api/user")
OkResponse.parse(res) === res // true: still a Response
```

`z.properties({ ... })` returns checks to pass to `.check()`, in Zod and in Zod Mini. The property schemas validate, but their results are discarded, so a transform or default does not change the value.

## Recursive Objects

Use a getter. `z.lazy()` still works, but the getter keeps object methods and infers the type. Since Zod 4.5, cyclic input parses too.

```typescript
const Category = z.object({
  name: z.string(),
  get children() {
    return z.array(Category).optional()
  },
})

type Category = z.infer<typeof Category>
// { name: string; children?: Category[] | undefined }
```

## Arrays

```typescript
z.array(z.string())           // string[]
z.array(z.string()).min(1)    // at least 1 element
z.array(z.string()).max(10)   // at most 10 elements
z.array(z.string()).length(5) // exactly 5 elements
z.array(z.string()).nonempty() // at least 1 element
```

## Tuples

```typescript
// Fixed-length typed array
z.tuple([z.string(), z.number(), z.boolean()])
// [string, number, boolean]

// With rest element
z.tuple([z.string(), z.number()]).rest(z.boolean())
// [string, number, ...boolean[]]
```

## Records

```typescript
// Dictionary with string keys
z.record(z.string(), z.number())
// Record<string, number>

// Enum keys: every key is required
z.record(z.enum(["a", "b"]), z.number())
// { a: number; b: number }; { a: 1 } fails
```

### z.partialRecord()

Keys from an enum or literal key schema are optional.

```typescript
z.partialRecord(z.enum(["a", "b"]), z.number())
// { a?: number; b?: number }; { a: 1 } passes
```

### z.looseRecord()

`z.record()` fails on a key that does not match the key schema. `z.looseRecord()` passes such keys through unchanged, which suits pattern properties combined with an object.

```typescript
const Contact = z
  .object({ name: z.string() })
  .and(z.looseRecord(z.string().regex(/_phone$/), z.e164()))
// home_phone and work_phone are validated as E.164; other keys pass through
```

## Maps and Sets

```typescript
z.map(z.string(), z.number())       // Map<string, number>
z.set(z.string())                    // Set<string>
z.set(z.string()).min(1)             // at least 1 element
z.set(z.string()).max(10)            // at most 10 elements
z.set(z.string()).nonempty()         // non-empty set
```

## Unions

### z.union()

Sequential matching — tries each branch in order.

```typescript
z.union([z.string(), z.number()])
// string | number
```

### z.discriminatedUnion()

Picks the branch by a shared discriminator field and validates only that branch.

```typescript
z.discriminatedUnion("type", [
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), count: z.number() }),
])
```

### z.xor()

Exactly one must match.

```typescript
z.xor([
  z.object({ email: z.email() }),
  z.object({ phone: z.string() }),
])
// { phone } passes; { email, phone } fails because both branches match
```

## Intersection

```typescript
z.intersection(
  z.object({ name: z.string() }),
  z.object({ age: z.number() }),
)
// { name: string; age: number }
```

Prefer `.extend()` or spread over intersection for object merging: `z.intersection()` returns a `ZodIntersection`, which has no `.pick()`, `.omit()` or other object methods (zod.dev/api, "Intersections").
