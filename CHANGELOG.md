# Changelog

Notable changes to this skill. The version that matters most in each entry is
the *upstream* one: a skill about a moving library is only as good as the
release it was last checked against.

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
