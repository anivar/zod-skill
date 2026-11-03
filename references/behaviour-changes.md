# Behaviour Changes by Release

Docs: zod.dev/v4/changelog, zod.dev/blog/zod-4-5, zod.dev/blog/zod-4-6, and the GitHub release notes for v4.4.0 · Zod 4.6.7

Each row is a change in what a parse accepts, rejects or returns, or in what an error or JSON Schema contains. A schema that passed its tests on an earlier release can fail on a later one. Read this file when you upgrade Zod, or when a schema behaves differently from code written for an earlier release.

The Test column names the test in `.github/check/claims.test.ts` that shows the result on 4.6.7. "Type-level" means the change shows only in TypeScript. "Not run" means the check does not test the row.

## From Zod 3 to 4.0

| Change | Result on 4.6.7 | Test |
|---|---|---|
| `z.number()` rejects `Infinity` and `-Infinity` | `z.number().safeParse(Infinity).success` is `false` | S5 |
| `z.int()` and `.int()` accept safe integers only | `z.int().safeParse(2 ** 53).success` is `false` | S5 |
| `z.uuid()` checks the RFC 9562 variant bits; `z.guid()` does not | `"00000000-0000-0000-c000-000000000000"` fails `z.uuid()` and passes `z.guid()` | B1 |
| `z.base64url()` rejects padding | `"SGVsbG8="` fails, `"SGVsbG8"` passes | B2 |
| A missing key with a `z.coerce.*` schema fails | `z.object({ foo: z.coerce.boolean() }).safeParse({})` gives `invalid_type`, expected `"nonoptional"` | B3 |
| `.default()` returns the default without parsing it; `.prefault()` parses it | `z.string().min(5).default("ab").parse(undefined)` returns `"ab"` | S3 |
| Defaults apply inside optional fields | `z.object({ a: z.string().default("tuna").optional() }).parse({})` returns `{ a: "tuna" }` | B4 |
| `z.record()` with an enum key requires every key; `z.partialRecord()` does not | `z.record(z.enum(["a", "b"]), z.number())` rejects `{ a: 1 }` | B5 |
| An intersection whose two results cannot merge throws a plain `Error`, not a `ZodError` | the message starts with "Unmergable intersection" | B6 |
| The input type of `z.coerce.*` is `unknown` | `z.input<typeof z.coerce.number>` is `unknown` | Type-level |
| `z.record()` needs a key schema and a value schema | `z.record(z.string())` is a type error | Type-level |

## 4.4

| Change | Result on 4.6.7 | Test |
|---|---|---|
| A key whose schema is `z.undefined()`, `z.unknown()` or `z.any()` is required: the key must be present, and its value can be `undefined` | `z.object({ a: z.unknown() }).safeParse({})` fails; `{ a: undefined }` passes | B7 |
| Tuple defaults appear in the output | `z.tuple([z.string(), z.string().default("fallback")]).parse(["a"])` returns `["a", "fallback"]` | B8 |
| `.merge()` throws when the receiver has refinements | the message says "Use .safeExtend() instead" | B9 |
| `z.base64()` rejects whitespace | `"Zm 9v"` fails | B10 |
| `z.httpUrl()` rejects a protocol with one slash | `"https:/example.com"` fails | B11 |
| `z.cuid()` is deprecated, and its pattern is tighter | the typings tag `cuid` `@deprecated` | S6 |
| A discriminated union error names the expected values | `"Invalid discriminator value. Expected 'circle' \| 'square'"`, with `options` on the issue | B12 |
| `z.treeifyError()` keeps the paths of issues inside a union | the issues of each union member sit under their field | B13 |
| `z.toJSONSchema()` drops the redundant `id` from `$defs` entries | `$defs.Inner` has no `id` key | B14 |

## 4.5

| Change | Result on 4.6.7 | Test |
|---|---|---|
| `z.iso.datetime()` requires seconds; `local: true` still accepts minutes | `"2020-01-01T06:15Z"` fails; union with `z.iso.datetime({ precision: -1 })` to accept it | B15 |
| String length counts code points, not UTF-16 code units | `z.string().max(5)` accepts five emoji; `z.string().min(5)` rejects three | B16 |
| A record's key schema applies only to the keys that match it | `z.object({ name: z.string() }).and(z.record(z.string().regex(/^S_/), z.string()))` accepts `{ name: "a", S_a: "s" }` | B17 |
| An `unrecognized_keys` issue does not stop the other checks | a strict object with a bad value and an extra key reports `invalid_type` and `unrecognized_keys` | B18 |
| `__proto__` is stripped from parsed objects; a strict object reports it as `unrecognized_keys` | the output has only the declared keys and a normal prototype | B19 |
| `z.ipv6()` and `z.ulid()` are stricter, and `z.httpUrl()` checks host length | `"::1\n"` fails `z.ipv6()`; a ULID that starts with `8` fails | B20 |
| Cyclic input parses through a recursive schema | an object that contains itself parses | S1 |

## 4.6

| Change | Result on 4.6.7 | Test |
|---|---|---|
| Error maps run when `result.error` is first read, not at parse time; `.parse()` is unchanged | `safeParse()`, then `z.config(z.locales.fr())`, then read the message: it is French | B21 |
| `z.emoji()` needs a pictograph, a regional indicator or a keycap | `"123"` fails | B22 |
| `.options` of a numeric TypeScript enum lists only the values | `[0, 1, 2]`, not the reverse-mapping names | B23 |
| `z.toJSONSchema()` combines chained checks; the chain order does not change the result | `z.number().min(0).max(23).int()` gives `minimum: 0, maximum: 23` | B24 |
| The bound getters (`.minLength`, `.maxLength`, `.minValue`, `.maxValue`, `.format`, `.isInt`, `.minDate`, `.maxDate`) read the combined checks | `z.string().min(8).length(5).minLength` is `8` | B25 |
| An email in a template literal no longer checks the text after it | `z.templateLiteral([z.email(), "\|", z.string()])` accepts `"a@b.cc\|a..b"` | B26 |
| `z.base64()` and `z.base64url()` check length and padding in code, not in the regex | what a plain `z.base64()` accepts does not change | Not run |
