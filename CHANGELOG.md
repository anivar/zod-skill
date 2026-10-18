# Changelog

Notable changes to this skill. The version that matters most in each entry is
the *upstream* one: a skill about a moving library is only as good as the
release it was last checked against.

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

## 1.2.0

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
