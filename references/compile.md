# Compile Reference

Docs: zod.dev/compile, zod.dev/blog/zod-4-5, zod.dev/blog/zod-4-6 · Zod 4.6.7

`z.compile()` turns a schema into flat JavaScript that checks valid input fast. The compiled schema returns the same data, the same issues and the same messages as the original. It has the same methods and inferred types. Added in Zod 4.5.

## `z.compile(schema)`

`z.compile()` returns a compiled copy and does not change the original.

```typescript
const Player = z.object({ username: z.string(), bio: z.string(), xp: z.number() })
const CompiledPlayer = z.compile(Player)

CompiledPlayer.parse({ username: "a", bio: "b", xp: 1 }) // same result as Player.parse()
```

A method that derives a schema (`.refine()`, `.extend()`, `.optional()`, `.meta()`) returns an uncompiled schema. Compile the final schema:

```typescript
const notCompiled = z.compile(z.string()).refine((val) => val.length > 1) // the .refine() result is not compiled
const compiled = z.compile(z.string().refine((val) => val.length > 1))
```

## `import "zod/compile"`

This import compiles every schema built after it, the first time the schema parses. It must run before the modules that define schemas. It is for applications, not libraries.

```sh
node --import zod/compile app.js     # ESM
node --require zod/compile app.cjs   # CommonJS
```

In Bun, add `zod/compile` to `preload` in `bunfig.toml`.

## What Does Not Compile

For these, `z.compile()` returns the original schema, uncompiled:

- async refinements, transforms and checks
- `z.xor()`
- recursive schemas
- `z.coerce.*`
- checks with a custom `when`
- `.catch()` with a function (`.catch(value)` compiles)

Inside an object, array, tuple, record or intersection, an unsupported child uses the standard parser and the rest stays compiled: `z.compile(z.object({ page: z.coerce.number() }))` returns a compiled schema. A `.catch()` function or anything async in the tree makes the whole schema fall back (measured on 4.6.7). The docs say the same for a union with an unsupported member; on 4.6.7 a union with a `z.coerce` member inside an object still compiles under `strict: true` (measured). Encoding and async parsing always use the standard parser.

Pass `strict: true` to throw instead of falling back. Use it in a test to prove a hot-path schema compiled:

```typescript
test("the player schema compiles", () => {
  expect(() => z.compile(Player, { strict: true })).not.toThrow()
})
```

It throws `z.ZodCompileAsyncError` for async schemas and `z.ZodCompileUnsupportedError` for the rest. Both are `Error` subclasses, not `ZodError`.

## Invalid Input Costs the Same

The compiled code only answers "valid or not". On invalid input Zod runs the standard parser again to build the issues. So:

- compilation does not make failures faster;
- a refinement or transform can run twice on invalid input, so keep them free of side effects;
- `.validate()` skips the error build. When you need only a boolean, use `.validate()` on the compiled schema.

## Content Security Policy

Compilation uses `new Function`. Where a strict Content Security Policy blocks it, the schema stays uncompiled. `z.config({ jitless: true })` turns off the global `zod/compile` mode; a direct `z.compile()` still tries.

`z.withParser(schema, parser)` (Zod 4.6) installs a parser that you generated somewhere else, at build time or with a native compiler. The parser returns what the schema would return, or `z.INVALID` to hand the input to the standard parser, which builds the issues.

```typescript
const isPlayer = (input: unknown): input is { username: string; bio: string; xp: number } =>
  typeof input === "object" && input !== null &&
  typeof (input as { username?: unknown }).username === "string" &&
  typeof (input as { bio?: unknown }).bio === "string" &&
  typeof (input as { xp?: unknown }).xp === "number"

const FastPlayer = z.withParser(Player, (input) =>
  isPlayer(input) ? { username: input.username, bio: input.bio, xp: input.xp } : z.INVALID
)
```

The parser rebuilds the object instead of returning `input`, because `z.object()` strips unknown keys.

## Bundle Size

The compiler adds about 7 KB gzipped (28 KB minified) to a bundle that calls `z.compile()` or imports `zod/compile`. A bundle that does neither pays nothing.

| Bundle, four-key object schema | Without compiler | With compiler |
|---|---|---|
| Zod | 24.1 KB | 31.1 KB |
| Zod Mini | 4.6 KB | 13.2 KB |

For a client bundle, compile only where a profile shows a hot path.

## Speed

The docs measure each schema alone in a tight loop: 1.8x for a 5-key object, 5.0x for 20 keys, 10.2x for 50 keys, 2.2x to 3.7x for tuples. Objects and tuples gain the most. Measure your own schemas before you decide.
