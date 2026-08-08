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
