# Zod 3 Reference

Docs: zod.dev/v4/changelog, zod.dev/v4/versioning, the Zod 3 README and ERROR_HANDLING.md at tag v3.24.4 · Zod 3.25.76

Read this in a file that uses the Zod 3 API (see "Which Zod" in `SKILL.md`). Every behaviour statement here names the test that ran it on zod 3.25.76 beside zod 4.6.7 (`.github/check/claims.test.ts`, ids V1 and so on); type-level statements are the `@ts-expect-error` lines in the Zod 3 rule files, compiled against the same release. 3.25.76 is the last Zod 3 release and the only one checked; `.pipe()`, `.cidr()` and Standard Schema arrived during the 3.x line, so the baseline is `^3.25.0`, not any 3.x.

## Which version a file uses

| Package | Root `zod` | `zod/v3` | `zod/v4` | Mini |
|---------|-----------|----------|----------|------|
| `zod@3.25.x` | Zod 3 | Zod 3 | Zod 4 | `zod/v4-mini` |
| `zod@4.x` | Zod 4 | Zod 3 | Zod 4 | `zod/mini` |

Both subpaths exist on both lines (V1). zod.dev/v4/versioning: no code changes were made between the last 3.25.x release and 4.0.0; the subpaths "will remain available forever"; Zod 3 "will continue to receive bug fixes & stability improvements". A library that accepts both declares `"zod": "^3.25.0 || ^4.0.0"`.

The import specifier decides. `from "zod/v4"` in a `zod@3.25` project is Zod 4 code; `from "zod/v3"` in a `zod@4` project is Zod 3 code. Only the bare `zod` specifier depends on the installed version.

## The API map, by rule

A rule with a file in `v3/rules/` has a Zod 3 form that differs in code. "Same" means the Zod 4 rule applies as written.

| Rule | Zod 4 | Zod 3 | File |
|------|-------|-------|------|
| `parse-use-safeParse` | `result.error.issues`; `z.ZodSafeParseResult<T>` | `.issues` (and its alias `.errors`); `z.SafeParseReturnType<Input, Output>` | `v3/rules/parse-use-safeParse.md` |
| `parse-async-required` | sync parse of an async check throws; `.validateAsync()` | Same throw, message "Use .parseAsync instead" (V16); no `.validate()`; `message` not `error` | `v3/rules/parse-async-required.md` |
| `parse-infer-types` | `z.infer`, `z.input`, `z.output`, `z.toZod<T>()` | `z.infer`, `z.input`, `z.output`; a `z.ZodType<T>` annotation in place of `z.toZod()` | `v3/rules/parse-infer-types.md` |
| `parse-validate-boolean` | `.validate()` | No `.validate()`; `.safeParse(x).success` | `v3/rules/parse-validate-boolean.md` |
| `schema-object-unknowns` | `z.strictObject()`, `z.looseObject()` | `.strict()`, `.passthrough()`, `.strip()`; `z.strictObject()` exists, `z.looseObject()` does not | `v3/rules/schema-object-unknowns.md` |
| `schema-union-discriminated` | `invalid_union` issue at `["type"]`; `z.xor()` | `invalid_union_discriminator` at `["type"]` (V7); no `z.xor()` | `v3/rules/schema-union-discriminated.md` |
| `schema-coercion-pitfalls` | `z.stringbool()` | No `z.stringbool()`; an enum of the accepted strings with a transform | `v3/rules/schema-coercion-pitfalls.md` |
| `schema-recursive-types` | getter; cyclic input parses | `z.lazy()` with a `z.ZodType<T>` annotation; cyclic input overflows the stack (V12) | `v3/rules/schema-recursive-types.md` |
| `schema-json-string` | `z.json()`, a codec | No `z.json()` and no codec; a transform that reports bad JSON with `ctx.addIssue` | `v3/rules/schema-json-string.md` |
| `refine-never-throw` | `ctx.issues.push()` in a transform | `ctx.addIssue()` and `z.NEVER`; no `ctx.issues` (V16) | `v3/rules/refine-never-throw.md` |
| `refine-vs-transform` | `z.regexes.integer` | A regex literal; `.pipe()` exists | `v3/rules/refine-vs-transform.md` |
| `refine-cross-field` | `error`, `when` | `message`; no `when` | `v3/rules/refine-cross-field.md` |
| `error-custom-messages` | `error` | `message`, `required_error`, `invalid_type_error`, `errorMap`; `error` is ignored (V4) | `v3/rules/error-custom-messages.md` |
| `error-formatting` | `z.flattenError()`, `z.treeifyError()`, `z.prettifyError()` | `error.flatten()`, `error.format()`; no top-level functions (V2, V6) | `v3/rules/error-formatting.md` |
| `error-input-security` | `reportInput` puts the input on each issue | No `reportInput`; no `input` field; `invalid_type` carries the type name in `received` (V7) | `v3/rules/error-input-security.md` |
| `perf-extend-spread` | `.extend()`, `.safeExtend()`, spread | `.extend()`, `.merge()`, spread; no `.safeExtend()` | `v3/rules/perf-extend-spread.md` |
| `perf-reuse-schemas` | `.pick()`, `.omit()`, `.partial()`, `.exactPartial()`, `z.deepPartial()` | `.pick()`, `.omit()`, `.partial()`, `.deepPartial()` method; no `.exactPartial()` | `v3/rules/perf-reuse-schemas.md` |
| `perf-zod-mini` | `zod/mini` | No Mini in Zod 3; `zod/v4-mini` on 3.25 is Zod 4 code | no Zod 3 form |
| `perf-compile` | `z.compile()` | No compiler | no Zod 3 form |
| `migrate-string-formats` | `z.email()` | `z.string().email()` is the correct form; `.ip()` and `.cidr()` exist | `v3/rules/migrate-string-formats.md` |
| `migrate-native-enum` | `z.enum(TSEnum)` | `z.nativeEnum(TSEnum)` is the correct form; `z.enum(TSEnum)` throws on parse (V14) | `v3/rules/migrate-native-enum.md` |
| `migrate-error-api` | `error` | `message`, `required_error`, `invalid_type_error`, `errorMap` are the correct forms | `v3/rules/migrate-error-api.md` |
| `pattern-branded-types` | `.brand<"USD">()`, type `number & z.$brand<"USD">` | `.brand<"USD">()`, type `number & z.BRAND<"USD">` | same (type name differs) |
| `pattern-codecs` | `z.codec()` | No codec; one schema per direction | `v3/rules/pattern-codecs.md` |
| `pattern-pipe` | `.pipe()`, `z.regexes.integer` | `.pipe()` exists (V17); a regex literal | `v3/rules/pattern-pipe.md` |
| `arch-boundary-parsing` | `z.flattenError()` at the boundary | `error.flatten()` | `v3/rules/arch-boundary-parsing.md` |
| `arch-schema-organization` | `z.email()` in the co-located schemas | `z.string().email()` | `v3/rules/arch-schema-organization.md` |
| `arch-schema-versioning` | `z.email()` | `z.string().email()` | `v3/rules/arch-schema-versioning.md` |
| `observe-structured-errors` | `z.flattenError()` | `error.flatten()` | `v3/rules/observe-structured-errors.md` |
| `observe-error-metrics` | `z.ZodType`, `z.ZodSafeParseResult` | `z.ZodTypeAny`, `z.SafeParseReturnType` | `v3/rules/observe-error-metrics.md` |

## No Zod 3 form

These rules describe a Zod 4 feature with no Zod 3 counterpart. In a Zod 3 file there is nothing to apply; the block check skips them when it compiles the other Zod 4 rules against Zod 3.

| Rule | Why |
|------|-----|
| `perf-compile` | Zod 3 has no `z.compile()`, `zod/compile` or `z.withParser()` (V2) |
| `perf-zod-mini` | Zod 3 has no Mini build; `zod/v4-mini` on 3.25 is the Zod 4 API (V1) |

## What Zod 3 does not have

Measured on 3.25.76 (V2, V3). Top level: `z.email()` and the other top-level string formats, `z.int()`, `z.iso`, `z.stringbool()`, `z.json()`, `z.codec()`, `z.compile()`, `z.flattenError()`, `z.treeifyError()`, `z.prettifyError()`, `z.formatError()`, `z.toJSONSchema()`, `z.registry`, `z.looseObject()`, `z.partialRecord()`, `z.xor()`, `z.config()`. Methods: `.validate()`, `.decode()`, `.encode()`, `.prefault()`, `.check()`, `.meta()`, `.register()`, `.overwrite()`, `.safeExtend()`, `.exactOptional()`.

For JSON Schema from a Zod 3 schema, the `zod-to-json-schema` package (3.25.x) declares `"zod": "^3.25.28 || ^4"`.

## Error customization in Zod 3

Four parameters, replaced in Zod 4 by `error` (zod.dev/v4/changelog). The Zod 4 `error` key compiles to nothing in Zod 3: TypeScript rejects it, and at runtime the default message appears (V4).

```typescript
// schema-level: required_error for undefined input, invalid_type_error for a wrong type
const Name = z.string({
  required_error: "Name is required",
  invalid_type_error: "Name must be a string",
})

// check-level: message, or the string alone
const Age = z.number().min(18, { message: "Must be 18+" })
const AgeShort = z.number().min(18, "Must be 18+")

// an error map returns { message }; ctx.defaultError is the message the lower-priority map produced
const Email = z.string({
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === "undefined") {
      return { message: "Email is required" }
    }
    return { message: ctx.defaultError }
  },
})
```

Precedence, highest first (V5): the error map passed to `.parse()` or `.safeParse()`, the schema-bound map or parameter, the global map set with `z.setErrorMap()`, the default map. Zod 4 reverses the first two: a schema-level error wins over a parse-level one.

## The Zod 3 error object

```typescript
const Signup = z.object({ email: z.string().email(), age: z.number().min(18) })

const result = Signup.safeParse({ email: "x", age: 3 })
if (!result.success) {
  result.error.issues // ZodIssue[]; result.error.errors is the same array
  result.error.flatten() // { formErrors: string[], fieldErrors: { email?: string[], age?: string[] } }
  result.error.format() // { _errors: string[], email?: { _errors: string[] }, age?: { _errors: string[] } }
}
```

`.flatten()` and `.format()` are methods on the error (V6); Zod 4 moves them to `z.flattenError()` and `z.treeifyError()` and marks the methods deprecated. `error.message` is the issues array as JSON, and `.toString()` returns the same text (V18). There is no `z.prettifyError()` in Zod 3.

### Issue codes

`z.ZodIssueCode` holds these codes (V7). An issue has `code`, `path` and `message`, plus the fields in the table (V7, V18). There is no `input` field: Zod 3 does not report the input value.

| Code | When | Fields | Zod 4 |
|------|------|--------|-------|
| `invalid_type` | Wrong type or missing key | `expected`, `received` (type names; `"undefined"` for a missing key) | `invalid_type`, with `expected` only |
| `invalid_string` | A string format or `.regex()` failed | `validation` (`"email"`, `"regex"`, …) | `invalid_format` |
| `invalid_literal`, `invalid_enum_value` | Not an allowed value | `expected`; `options` | `invalid_value` |
| `invalid_union` | No branch matched | `unionErrors: ZodError[]` | `invalid_union`, with `errors` |
| `invalid_union_discriminator` | Unknown discriminator value | `options` | `invalid_union` at the discriminator path |
| `unrecognized_keys` | Unknown keys under `.strict()` | `keys` | `unrecognized_keys` |
| `too_small`, `too_big` | Below or above a bound | `minimum`/`maximum`, `inclusive`, `exact`, `type` | `too_small`, `too_big` with `origin` |
| `not_multiple_of`, `not_finite` | `.multipleOf()`, `.finite()` | `multipleOf` | `not_multiple_of`; Infinity is `invalid_type` |
| `invalid_date` | An invalid `Date` instance | | `invalid_type` |
| `invalid_arguments`, `invalid_return_type` | A `z.function()` implementation called with bad arguments, or returning a bad value | `argumentsError`, `returnTypeError` (each a `ZodError`) | The function throws directly |
| `invalid_intersection_types` | Unmergeable intersection results, e.g. two transforms on one key | | A plain `Error` |
| `custom` | `.refine()`, `.superRefine()`, a transform's `ctx.addIssue()` | `params` | `custom` |

## What parses differently

Each row names the test that measured it on 3.25.76 and 4.6.7.

| Behaviour | Zod 3 | Zod 4 | Test |
|-----------|-------|-------|------|
| Error map precedence | the map passed to `.parse()` wins | the schema-level error wins | V5 |
| Default message for a missing string | "Required" | "Invalid input: expected string, received undefined" | V8 |
| Default message for `.email()` | "Invalid email" | "Invalid email address" | V8 |
| Default message for `.min(5)` on a string | "String must contain at least 5 character(s)" | "Too small: expected string to have >=5 characters" | V8 |
| `.default(x)` on `undefined` | `x` is parsed by the schema; `z.string().min(5).default("ab")` fails | `x` is returned as is; use `.prefault()` for the old behaviour | V9 |
| `.default("tuna")` after `.transform((s) => s.length)` | 4 | `"tuna"`, and the type requires a number | V9 |
| Missing key with `z.coerce.boolean()` | `false` | an issue; add `.default()` | V10 |
| `.default()` inside `.optional()` on a missing key | key absent | default applied | V11 |
| `z.any()` and `z.unknown()` keys | optional at parse time | required (since 4.4) | V11 |
| `z.record(z.enum([...]), v)` | keys optional | every key required; `z.partialRecord()` for optional | V11 |
| `z.record(valueSchema)` | one argument allowed | two arguments required | V11 |
| Cyclic input to a recursive schema | `RangeError`: stack overflow | parses (since 4.5) | V12 |
| A getter in an object shape | runs; under `strict` TypeScript rejects it with TS7023 (implicit `any`) | the documented form | V12 |
| `z.enum(TSEnum)` | TypeScript rejects it; with a cast the schema builds and the first parse throws `TypeError` | the documented form; `z.nativeEnum()` deprecated | V14 |
| `.Enum` and `.Values` on an enum schema | present, same as `.enum` | removed | V14 |
| `.datetime()` without seconds | accepted | rejected; `precision: -1` accepts minutes | V15 |
| `.uuid()` with invalid variant bits | accepted | rejected; `z.guid()` for any 8-4-4-4-12 | V15 |
| `z.number()` with `Infinity` | accepted; `.finite()` rejects it | rejected | V15 |
| `.int()` with an unsafe integer | accepted | rejected | V15 |
| `.base64url()` with padding | accepted | rejected | V15 |
| String length | UTF-16 code units: `"😀"` has length 2 | code points: length 1 | V15 |
| `ctx.path` in `.superRefine()` | the issue path | `undefined` | V16 |
| `ctx.issues` in `.transform()` | `undefined`; use `ctx.addIssue()` | the issues array | V16 |
| `.refine(fn, (val) => ({ message }))` | works | the overload is removed | V16 |
| A thrown error inside `.refine()` | escapes `safeParse()` | escapes `safeParse()` | V16 |
| An object refinement after a failed field check | runs; both issues reported | runs; both issues reported | V16 |
| An object refinement after a field type error | skipped | skipped | V16 |
| `.nonempty()` inferred type | `[string, ...string[]]` | `string[]` | Type-level |
| `.refine()` with a type predicate | narrows the output type | does not narrow | Type-level |
| `z.coerce.*` input type | the coerced type | `unknown` | Type-level |

## Moving a file from Zod 3 to Zod 4

zod.dev/v4/versioning: upgrade to `zod@^3.25.0`, change the files you migrate to `from "zod/v4"`, and when every file has moved install `zod@^4.0.0`; the `zod/v4` imports keep working and can be rewritten to `zod`. The migration guide (zod.dev/v4/changelog) lists the breaking changes by impact and names a community codemod, `zod-v3-to-v4`.

What to change in each file, in the order the migration guide gives:

1. Error customization: `message`, `required_error`, `invalid_type_error` and `errorMap` become `error` (`migrate-error-api`).
2. `ZodError`: `.errors` becomes `.issues`; `.format()` and `.flatten()` become `z.treeifyError()` and `z.flattenError()`; the issue codes in the table above change.
3. `z.number()`: no `Infinity`; `.safe()` is `.int()`; unsafe integers fail.
4. `z.string().email()` and the other formats become `z.email()` (`migrate-string-formats`); `.ip()` and `.cidr()` split into v4 and v6 forms.
5. `z.coerce`: a missing key fails; add `.default()`.
6. `.default()` no longer parses the default; `.prefault()` does.
7. `z.object()`: defaults apply inside optional fields; `.strict()` and `.passthrough()` become `z.strictObject()` and `z.looseObject()`; `.merge()` becomes `.extend()`; `.deepPartial()` is removed; `z.any()` and `z.unknown()` keys become required.
8. `z.nativeEnum()` becomes `z.enum()`; `.Enum` and `.Values` are removed.
9. `.nonempty()` infers `string[]`; `z.tuple([a], rest)` for the old type.
10. `z.function()`: `.args().returns()` becomes `z.function({ input, output })`, and the result is no longer a schema.
11. `.refine()`: type predicates do not narrow; `ctx.path` is gone; the message-function overload is gone.
12. `z.record()` needs two arguments; an enum key makes every key required.
13. `z.intersection()` conflicts throw a plain `Error`.
