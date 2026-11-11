# Changelog

Notable changes to this skill. The version that matters most in each entry is
the *upstream* one: a skill about a moving library is only as good as the
release it was last checked against.

## [2.1.0] — 2026-11-11

Zod 3 projects. Checked against zod 4.6.7 and, for the Zod 3 files, zod 3.25.76, the last
Zod 3 release line. Nothing moves or is removed; the Zod 4 rule and reference paths are unchanged.

### Added

- **`SKILL.md` "Which Zod".** The agent decides per file, from the import specifier and the
  installed version, which API to write. Both package lines export both: `zod@3.25.x` has
  `zod/v4`, `zod@4.x` has `zod/v3`. A Zod 3 file takes `v3/rules/<id>.md` where it exists; the
  `migrate-` rules' "Incorrect" blocks are the correct Zod 3 code until the file moves to `zod/v4`.
- **`v3/rules/`**: 27 Zod 3 rule files, one per rule whose code differs, in the same
  Incorrect→Correct shape; `pattern-branded-types` is the one rule whose code compiles unchanged
  against Zod 3, and `perf-compile` and `perf-zod-mini` have no Zod 3 form. `.strict()`/`.passthrough()` for unknown keys; `z.lazy()` with a
  `z.ZodType<T>` annotation for recursion; `message`, `required_error`, `invalid_type_error` and
  `errorMap` for messages; `.flatten()`/`.format()` for formatting; `ctx.addIssue()` and `z.NEVER`
  in transforms; an enum-and-transform recipe in place of `z.stringbool()`; a reporting transform
  in place of `z.json()` and the JSON codec; a schema per direction in place of `z.codec()`;
  `z.ZodTypeAny` and `z.SafeParseReturnType` in the typed helpers. Each `migrate-` rule has a
  Zod 3 file that says the Zod 3 form is correct there.
- **`v3/references/zod-3.md`**: the version test, the API map by rule, what Zod 3 lacks, the
  Zod 3 error customization and precedence, the Zod 3 issue codes with their fields, a behaviour
  table of what parses differently (each row names its test), and the migration order from the
  zod.dev migration guide.
- **`v3/AGENTS.md`**, generated from `v3/rules/` by `agents.ts`. Both compiled files now carry the
  "Which Zod" section, so an agent that reads one file alone still sees the version test.
- **The check.** Every block under `v3/` compiles against zod 3.25.76 through the `zod3` alias in
  `package.json`; `zod` and `zod/*` imports in those blocks resolve to it, so the text stays what a
  Zod 3 reader copies, and `zod/mini` fails there as it should. Claims V1–V18 run the Zod 3
  behaviour statements at runtime beside Zod 4; the type-level statements are `@ts-expect-error`
  lines in the Zod 3 blocks. The rules that have no Zod 3 file are compiled against Zod 3 as well,
  so "the Zod 4 rule applies as written" is checked, not asserted; the rules with no Zod 3 form at
  all are listed in `v3/references/zod-3.md`. The text guards against wrong Zod 4 statements scan
  the Zod 4 files only; the date and release-section guards scan everything. `agents.ts` checks
  both baselines against both pins, that every Zod 3 rule file has a Zod 4 counterpart, and that
  each Zod 3 reference names Zod 3.25.76 on line 3. The weekly CI job moves `zod3` to the latest
  3.x beside `zod@latest`, so a patch on either line that changes a claim fails visibly.

### Changed

- The preamble no longer tells agents to avoid Zod 3 forms outright. It tells them to establish
  the version first and to write neither API into a file of the other version.
- README: the problem statement names both failure directions; Baseline lists both ranges.

## [2.0.0] — 2026-11-03

A major version: `references/advanced-features.md` is removed, so a link to it breaks. The
references follow the zod.dev pages instead of the releases. Checked against zod 4.6.7.

### Changed

- **`references/advanced-features.md` is removed.** Its sections moved: codecs to
  `codecs.md`; registries and JSON Schema to `metadata-and-json-schema.md`; functions,
  `z.instanceof()` and branded types to `schema-types.md`; `.readonly()` and the optional-key
  methods to `objects-and-composition.md`; Standard Schema to `parsing-and-inference.md`.
  A link to the old path breaks.
- **The "Zod 4.6 Highlights" section of `SKILL.md` is removed.** `.validate()` is in
  `parsing-and-inference.md` and its own rule; `z.properties()` is in
  `objects-and-composition.md`; `z.withParser()` is in `compile.md`; the `fromJSONSchema()`
  keywords are in `metadata-and-json-schema.md`; the lazy error maps and `z.emoji()` are in
  `behaviour-changes.md`.
- Every reference names its docs pages and Zod version on line 3. The skill text carries no
  check dates; the CHANGELOG headings date each release.

### Added

- `references/behaviour-changes.md`: what parses differently in 4.0, 4.4, 4.5 and 4.6. Each
  row names its test, or says "Type-level" or "Not run".
- `references/codecs.md`: each direction of a codec, `z.input()`/`z.output()`, and the 16
  recipes from zod.dev/codecs. The check runs the recipe block as written.
- `references/metadata-and-json-schema.md` and `references/compile.md`.
- Rule `perf-compile`: compile the final schema, and prove it compiled with `strict: true`.
- Rule `parse-validate-boolean`: `.validate()` for a yes or no; it narrows to the input type,
  and the check measures that trap (N1).
- Rule `schema-json-string`: `z.json()` does not parse a string; decode JSON text with a
  codec. The skill taught the opposite before 1.2.2 (F1).
- `z.stringFormat()`, symbol keys, `z.instanceof().properties()`, `.exactOptional()` and
  `.nonoptional()`, `z.ZodCompileAsyncError` and `z.ZodCompileUnsupportedError`.
- The check: claims for every new behaviour (B, C, K, M, N ids), guards against a
  release-specific section and against dates in the skill text, and README counts and
  reference headers in `agents.ts`.
- `.github/check/sync-testing.ts` generates the zod-testing guide from
  `references/testing.md`, `testing-api.md` and `testing-anti-patterns.md`, and with
  `--check` fails when either copy changed alone.
- `references/testing.md`: assert error messages under one configuration, because error
  maps run on the first read of `result.error` since 4.6.

### Measured against the docs

On 4.6.7, three statements on zod.dev do not hold. The skill states both and follows the
measurement:

- The metadata page says a registry throws on a duplicate `id`. `.add()` and `.meta()`
  accept it; one `z.toJSONSchema()` conversion that meets both schemas throws.
- The metadata page says `.refine()` drops metadata. `.refine()` and checks keep it;
  `.optional()` and `.transform()` drop it.
- The compile page says a union with an unsupported member makes the whole schema fall
  back. A union with a `z.coerce` member inside an object still compiles under
  `strict: true`.

### zod-testing 1.2.0 (sibling repo)

Its guide is now generated from this skill's testing references, and a workflow there
fails when the copies differ. This drops two wrong statements that only its copy carried:
that Zod 4 removes `z.nativeEnum()` (it is deprecated, P3) and a 5.9x `.validate()` figure
(S16).

## [1.2.2] — 2026-11-03

Checked against zod 4.6.7 and these zod.dev pages (api, basics,
error-customization, error-formatting, metadata, json-schema, codecs, compile, packages,
v4 changelog, library-authors, and the 4.5 and 4.6 release posts). Ids (F, P, S, R)
match the test names in `.github/check/claims.test.ts`.

### Added

- **`.github/check/`**, an executable check of the skill's text:
  - `blocks.ts` type-checks every TypeScript block under `strict` with TypeScript 5.9.3
    and zod 4.6.7. No diagnostic is filtered. A line that must not compile carries
    `// @ts-expect-error`; a deprecated call needs a `// deprecated` comment, and that
    comment needs a deprecated call.
  - `claims.test.ts` runs each behaviour claim on zod 4.6.7 and guards the text against
    each corrected claim, named by audit id.
  - `agents.ts` generates `AGENTS.md` from `SKILL.md` and `rules/`, checks that the
    baseline in `SKILL.md`, `README.md` and the pinned zod agree, and checks that every
    reference to a rule id, a `references/` file or a relative link resolves.
- **`.github/workflows/gate.yml`** runs the check on every pull request and push to
  main, and weekly against `zod@latest`. Actions are pinned by commit.

### Corrected

- **APIs that do not exist or take other arguments:** `z.json()` parses no string (F1);
  `z.function({ input, output })` (F2); `registry.add()` (F3); `z.file().mime()` (F4);
  `z.float32()`/`z.float64()`, no `z.float()` (F5); `z.xor([a, b])` (F6);
  `z.ZodSafeParseResult` (F7); `StandardSchemaV1` (F8); `.issues`, not `.errors` (F9).
- **Things called removed that still work:** `z.lazy()` (P1), `message` (P2, deprecated),
  `z.nativeEnum()` (P3, deprecated), `z.formatError()` (P4, deprecated).
- **Wrong behaviour:** cyclic input parses since 4.5 (S1); Zod 4 issue codes (S2);
  `.default()` short-circuits (S3); Zod Mini sizes, JSON Schema support and import path
  (S4, S17); `.finite()`/`.safe()` (S5); `z.cuid()` deprecated (S6); `z.uuid()` accepts
  every version (S7); no built-in codecs (S8); `z.$brand` (S10); `required_error` is a
  type error and ignored at runtime (S11); `z.preprocess()` is not legacy (S12);
  `z.properties()` is in both packages (S13); zod-testing is not archived (S14);
  `.validate()` figures from the docs, 16x and 35x (S16). S9 is fixed by generating
  `AGENTS.md`.
- **Found by the check after the audit:** an object refinement runs after a failed check
  and skips after a type error; `parseInt` accepts `"12abc"`, so the numeric-string
  examples check with `z.regexes.integer`; `.extend()` on a refined object throws only on
  an overwrite; `z.function()` throws a core `$ZodError`, not `z.ZodError`; Express
  handlers that used `await` were not `async`; the middleware typed `req` as the DOM
  `Request`; a database test asserted on a mock it never passed in; the
  `expect(() => parse()).toThrow()` rationale was wrong (it fails when nothing throws,
  and passes on any error); the ESLint examples used `.eslintrc`, which ESLint 10 does not
  read, and the `parse` selector also banned `JSON.parse()`; Vitest 5 has no top-level
  `bench` export; madge's option is `tsConfig`; the heading anchors in `AGENTS.md`.
- **CHANGELOG 1.1.0** says `.apply()` was left out because the docs did not show it.
  zod.dev/api documents `.apply()`, and the skill covers it (S15).

At `1f0cd1c` the block check reports 303 findings in 262 blocks; 166 of them are names
an example used without declaring. Now: 248 blocks, 0 findings; 74 claims pass. Against
`1f0cd1c`, all 37 text guards fail.

## [1.2.1] — 2026-11-03

Audited the testing references against zod-schema-faker 3.0.1, @faker-js/faker 10.6.0,
fast-check 4.10.2 and @anatine/zod-mock 3.14.0, with Zod at 4.6.7.

### Corrected

- **Every zod-schema-faker example imported the Zod 3 entry.** The package root is the
  library's Zod 3 entry and throws `Unsupported schema type` on a Zod 4 schema, so the
  mock-data examples failed on the skill's own baseline. They now import
  `zod-schema-faker/v4` and call `setFaker(faker)` once.
- **`@anatine/zod-mock` does not support Zod 4.** Its latest release declares
  `zod ^3.21.4`, and `generateMock()` returns `undefined` for a Zod 4 schema. The example
  is replaced by that warning.
- **The property example generated nothing.** `fc.property(fc.constant(null), ...)`
  reports `[null]` as its counterexample and cannot replay the data that failed. It is
  replaced by properties built from fast-check arbitraries, which shrink, and a seeded
  faker for "the schema accepts its own data", which replays.
- **The transform example passed silently** when a generated input did not parse.

Executed under bun 1.4.4: every replacement example, taken from these files, passes
(34 tests across both repos). Five planted bugs in the order total, the age bound and
an unfakeable refine each fail a property; the arbitrary-built ones shrink to small
cases (`qty: 3`, `qty: 11`, `age: 151`).

### Added

- Anti-pattern: a property over a constant.

### zod-testing 1.1.1 (sibling repo)

The same corrections.

## [1.2.0] — 2026-10-18

Updated for **Zod 4.6** (audited against 4.6.7). Baseline raised from `^4.3.0` to `^4.6.0` in `SKILL.md`, `AGENTS.md` and `README.md`; `metadata.version` is now 1.2.0.

### Added

- **`.validate()` guidance**: boolean-only validation as a type guard, with the short-circuit and performance semantics (up to 35x faster than `.safeParse().success` on invalid input compiled with `z.compile()`).
- **`z.properties()`**: in-place property validation that preserves class instances and prototypes, contrasting with `z.object()`'s plain-object return.
- **`z.withParser()`**: build-time parser installation for CSP-strict environments where `new Function` is blocked.
- **`z.iban()`** and the six new `fromJSONSchema()` keywords (`minProperties`/`maxProperties`, `uniqueItems`, `contains`/`minContains`/`maxContains`).
- **Lazy error-map timing**: error maps now evaluate on first read of `result.error`; `z.config()` changes between parse and read apply the newer value.
- **`z.emoji()` requires a pictograph**, plus the standalone `@zod/mini` package, faster CommonJS, and the recursive-schema memory fix.

### zod-testing 1.1.0 (sibling repo)

`zod-testing` gains a "Zod 4.6 in Tests" section: `.validate()` as the cheap boolean assertion (vs `.safeParse().success`), `z.compile()` for hot suites, and the lazy error-map gotcha for locale assertions.

## [1.1.0] — 2026-08-08

Audited against [zod.dev](https://zod.dev)'s documentation — the full text, not
the release notes — with Zod at 4.4.3.

### Corrected

- **`z.nativeEnum()` is deprecated, not removed.** The skill said removed in
  five places, including a lint rule whose message told people their code would
  not run. Deprecated code runs; an agent acting on "removed" may refactor
  working schemas or report a compile error that does not exist.

### Added

- **Testing.** Merged from the `zod-testing` skill: schema correctness testing,
  error assertions, mock data with zod-schema-faker, snapshot testing through
  `z.toJSONSchema()`, and property-based testing. Three new references.
- **Top-level codec functions** — `z.decode()`, `z.encode()`, `z.invertCodec()`.
  The skill covered `z.codec()` but only its method form.
- **`z.guid()` and `z.hash()`** string formats.
- **`.exactOptional()` and `.nonoptional()`** — the distinction between a key
  being absent and being present-and-undefined.
- **Forward-looking anti-patterns.** A section on working code that a newer API
  now does better: transform pairs that should be codecs, hand-checked exclusive
  unions that should be `z.xor()`, hand-written JSON Schema, regex format checks
  that have named equivalents. An anti-pattern is not only what breaks — it is
  also what you are maintaining that the library would maintain for you.

### Changed

- Baseline moved from `^4.0.0` to `^4.3.0`.

### Deliberately not added

`slugify`, `.with()`, `.apply()`, `.overwrite()` and `.register()`. They appear
in 4.3 release notes and have no presence in the documentation. A skill should
not teach an interface the project has not committed to; if they are documented
later, they belong here then.

## [1.0.0]

Initial release: 27 rules across 9 categories, 9 references, compiled AGENTS.md.
