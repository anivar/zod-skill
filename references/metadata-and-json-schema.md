# Metadata and JSON Schema Reference

Docs: zod.dev/metadata, zod.dev/json-schema, zod.dev/blog/zod-4-6 · Zod 4.6.7

## Registries

A registry maps schemas to typed metadata.

```typescript
const myRegistry = z.registry<{ description: string }>()
const mySchema = z.string()

myRegistry.add(mySchema, { description: "A cool schema" })
myRegistry.has(mySchema) // true
myRegistry.get(mySchema) // { description: "A cool schema" }
myRegistry.remove(mySchema)
myRegistry.clear()
```

TypeScript checks the metadata against the registry's type. A second type argument limits which schemas the registry accepts.

```typescript
const stringsOnly = z.registry<{ description: string }, z.ZodString>()
stringsOnly.add(z.string(), { description: "ok" })
// @ts-expect-error ZodNumber is not assignable to ZodString
stringsOnly.add(z.number(), { description: "no" })
```

`z.$output` and `z.$input` in the metadata type stand for the schema's output and input types.

```typescript
const examples = z.registry<{ examples: z.$output[] }>()
examples.add(z.number(), { examples: [1, 2, 3] })
```

### `.register()`

`schema.register(registry, meta)` adds the schema and returns the same schema, not a copy. Use it to register inline.

```typescript
const Labels = z.registry<{ label: string }>()
const Signup = z.object({
  name: z.string().register(Labels, { label: "Full name" }),
  age: z.number().register(Labels, { label: "Age" }),
})
```

## Global Metadata: `.meta()` and `.describe()`

`.meta(meta)` adds a copy of the schema to `z.globalRegistry` and returns the copy. `.meta()` with no argument reads the metadata. `.describe(text)` is a short form of `.meta({ description: text })`; the docs recommend `.meta()`.

```typescript
const Email = z.email().meta({
  id: "email_address",
  title: "Email address",
  description: "Your email address",
})

Email.meta() // { id: "email_address", title: "Email address", description: "Your email address" }
```

`z.globalRegistry` accepts `id`, `title`, `description`, `deprecated` and other keys. Declaration merging adds typed keys:

```typescript
declare module "zod" {
  interface GlobalMeta {
    examples?: unknown[]
  }
}
```

### Metadata belongs to one schema instance

Every method returns a new schema. Which ones keep the metadata, measured on 4.6.7:

| Method | Keeps the metadata |
|---|---|
| `.refine()`, `.min()` and other checks | Yes |
| `.optional()`, `.nullable()`, `.transform()` and other wrappers | No |

The zod.dev metadata page says `.refine()` drops it; on 4.6.7 it does not. Call `.meta()` last, on the schema you export.

### Registry ids

The zod.dev metadata page says a registry throws when two schemas get the same `id`. On 4.6.7, measured:

- `.add()` and `.meta()` accept a duplicate `id` without an error.
- `z.toJSONSchema()` throws "Duplicate schema id" when one conversion meets two schemas with the same `id`.
- `z.toJSONSchema(registry)` keeps one of the two schemas and drops the other without an error.

Keep ids unique, and test the JSON Schema output of each registry you publish.

## `z.toJSONSchema()`

The default target is JSON Schema Draft 2020-12, and the output is for the output type.

```typescript
const User = z.object({ name: z.string(), age: z.number() })

z.toJSONSchema(User)
// {
//   $schema: "https://json-schema.org/draft/2020-12/schema",
//   type: "object",
//   properties: { name: { type: "string" }, age: { type: "number" } },
//   required: ["name", "age"],
//   additionalProperties: false,
// }
```

`z.object()` gives `additionalProperties: false` because it strips unknown keys. `z.looseObject()` never sets it; `z.strictObject()` always does. In `io: "input"` mode, `z.object()` does not set it.

| Option | Values | Effect |
|---|---|---|
| `target` | `"draft-2020-12"` (default), `"draft-07"`, `"draft-04"`, `"openapi-3.0"` | The JSON Schema dialect |
| `io` | `"output"` (default), `"input"` | The side of pipes, defaults, codecs and coerced schemas to describe |
| `unrepresentable` | `"throw"` (default), `"any"`, or a function | What to do with `z.bigint()`, `z.date()`, `z.map()`, `z.set()`, `z.symbol()`, `z.undefined()`, `z.void()`, `z.nan()`, `z.custom()` and transforms |
| `cycles` | `"ref"` (default), `"throw"` | A cycle becomes `{ $ref: "#" }`, or throws |
| `reused` | `"inline"` (default), `"ref"` | A schema used twice is inlined, or moved to `$defs` |
| `metadata` | a registry | Where to read metadata; `z.registry()` drops it all |
| `override` | `(ctx) => void` | Change `ctx.jsonSchema` for each schema |
| `uri` | `(id) => string` | The `$ref` URI for an `id`, when you convert a registry |

```typescript
const Lengthy = z.string().transform((val) => val.length).pipe(z.number())
z.toJSONSchema(Lengthy)                  // { type: "number" }
z.toJSONSchema(Lengthy, { io: "input" }) // { type: "string" }

// Represent a Date as an ISO string; throw on every other unrepresentable schema
z.toJSONSchema(z.object({ at: z.date() }), {
  unrepresentable: ({ zodSchema }) =>
    zodSchema._zod.def.type === "date" ? { type: "string", format: "date-time" } : "throw",
})
```

Metadata copies into the output and wins over the keywords Zod generates.

### Convert a Registry

Pass a registry to get one JSON Schema per schema that has an `id`. A schema without an `id` is left out.

```typescript
const Schemas = z.registry<{ id: string }>()
Schemas.add(z.object({ title: z.string() }), { id: "Post" })

z.toJSONSchema(Schemas)
// { schemas: { Post: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", ... } } }
```

Since 4.6, chained checks combine: `z.number().min(0).max(23).int()` gives `minimum: 0, maximum: 23` in any order (see `references/behaviour-changes.md`).

## `z.fromJSONSchema()`

Converts a JSON Schema to a Zod schema. The zod.dev JSON Schema page marks it experimental and outside the stable API, so pin the Zod version where you use it.

```typescript
const FromSpec = z.fromJSONSchema({
  type: "object",
  properties: { name: { type: "string" }, age: { type: "integer", minimum: 0 } },
  required: ["name"],
})

z.fromJSONSchema({ type: "object", minProperties: 2 }).safeParse({ a: 1 }).success          // false
z.fromJSONSchema({ type: "array", uniqueItems: true }).safeParse([{ a: 1 }, { a: 1 }]).success // false
```

Since 4.6 it reads `minProperties`, `maxProperties`, `uniqueItems`, `contains`, `minContains` and `maxContains`. Uniqueness is structural, so `[{ a: 1 }, { a: 1 }]` has a duplicate.

## Zod Mini

Zod Mini has registries and `z.toJSONSchema()`. It sets a description through a check: `z.string().check(z.describe("a name"))`.
