# Zod Schema Testing Guide

Checked against Zod 4.6.7, Vitest 5, fast-check 4 and zod-schema-faker 3. The standalone zod-testing skill covers the same topic.

**IMPORTANT:** Your training data about testing Zod schemas may be outdated — Zod 4 changes issue codes and error formatting, deprecates `z.nativeEnum()`, and adds APIs such as `z.toJSONSchema()` and `.validate()`. Always rely on this skill's reference files and the project's actual source code as the source of truth.

## Testing Priority

1. **Schema correctness** — does the schema accept valid data and reject invalid data?
2. **Error messages** — does the schema produce the right error messages and codes?
3. **Integration** — does the schema work correctly with API handlers, forms, database layers?
4. **Edge cases** — boundary values, optional/nullable combinations, empty inputs

## Core Pattern

```typescript
import { describe, it, expect } from "vitest" // or jest
import * as z from "zod"

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().min(0).max(150),
})

describe("UserSchema", () => {
  it("accepts valid data", () => {
    const result = UserSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      age: 30,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing required fields", () => {
    const result = UserSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const flat = z.flattenError(result.error)
      expect(flat.fieldErrors.name).toBeDefined()
      expect(flat.fieldErrors.email).toBeDefined()
    }
  })

  it("rejects invalid email", () => {
    const result = UserSchema.safeParse({
      name: "Alice",
      email: "not-an-email",
      age: 30,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative age", () => {
    const result = UserSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      age: -1,
    })
    expect(result.success).toBe(false)
  })
})
```

## Testing Approaches

| Approach | Purpose | Use When |
|----------|---------|----------|
| `safeParse()` result checking | Schema correctness | Default — always use safeParse in tests |
| `z.flattenError()` assertions | Error message testing | Verifying specific field errors |
| `z.toJSONSchema()` snapshots | Schema shape testing | Detecting unintended schema changes |
| Mock data generation | Fixture creation | Need valid/randomized test data |
| Property-based testing | Fuzz testing | Schemas must handle arbitrary valid inputs |
| Structural testing | Architecture | Verify schemas are only imported at boundaries |
| Drift detection | Regression | Catch unintended schema changes via JSON Schema snapshots |

## Schema Correctness Testing

### Always Use safeParse() in Tests

```typescript
const AgeField = z.int().min(0)
const invalidData = -1

// GOOD: asserts that validation failed, and can assert on the issues
const result = AgeField.safeParse(invalidData)
expect(result.success).toBe(false)
expect(result.error?.issues[0]?.code).toBe("too_small")

// BAD: passes on any thrown error, including a TypeError from a bug in a transform
expect(() => AgeField.parse(invalidData)).toThrow()
```

When only the yes or no matters, `.validate()` returns a boolean: `expect(AgeField.validate(invalidData)).toBe(false)`.

### Test Both Accept and Reject

```typescript
describe("EmailSchema", () => {
  const valid = ["user@example.com", "a@b.co", "user+tag@domain.org"]
  const invalid = ["", "not-email", "@missing.com", "user@", "user @space.com"]

  it.each(valid)("accepts %s", (email) => {
    expect(z.email().safeParse(email).success).toBe(true)
  })

  it.each(invalid)("rejects %s", (email) => {
    expect(z.email().safeParse(email).success).toBe(false)
  })
})
```

### Test Boundary Values

```typescript
const AgeSchema = z.number().min(0).max(150)

it("accepts minimum boundary", () => {
  expect(AgeSchema.safeParse(0).success).toBe(true)
})

it("accepts maximum boundary", () => {
  expect(AgeSchema.safeParse(150).success).toBe(true)
})

it("rejects below minimum", () => {
  expect(AgeSchema.safeParse(-1).success).toBe(false)
})

it("rejects above maximum", () => {
  expect(AgeSchema.safeParse(151).success).toBe(false)
})
```

## Error Assertion Patterns

### Assert Specific Field Errors

```typescript
it("shows correct error for invalid email", () => {
  const result = UserSchema.safeParse({ name: "Alice", email: "bad", age: 30 })
  expect(result.success).toBe(false)
  if (!result.success) {
    const flat = z.flattenError(result.error)
    expect(flat.fieldErrors.email).toBeDefined()
    expect(flat.fieldErrors.email![0]).toContain("email")
  }
})
```

### Assert Error Codes

```typescript
it("produces correct error code", () => {
  const result = z.number().safeParse("not a number")
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].code).toBe("invalid_type")
  }
})
```

### Assert Custom Error Messages

```typescript
const Schema = z.string({ error: "Name is required" }).min(1, "Name cannot be empty")

it("shows custom error for missing field", () => {
  const result = Schema.safeParse(undefined)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].message).toBe("Name is required")
  }
})
```

## Mock Data Generation

### Using zod-schema-faker

Import from `zod-schema-faker/v4`. The package root is the library's Zod 3 entry and throws `Unsupported schema type` on a Zod 4 schema. `fake()` returns the schema's input type; parse the value to get the output of a schema with a transform.

```bash
npm install -D zod-schema-faker @faker-js/faker randexp
```

```typescript
import { faker } from "@faker-js/faker"
import { fake, setFaker } from "zod-schema-faker/v4"
import { z } from "zod"

setFaker(faker) // call once in test setup (beforeAll or setupFiles)

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().min(0).max(150),
})

it("schema accepts generated data", () => {
  const mockUser = fake(UserSchema)
  expect(UserSchema.safeParse(mockUser).success).toBe(true)
})
```

### Seeding for Deterministic Tests

```typescript
import { seed, fake } from "zod-schema-faker/v4"

beforeEach(() => {
  seed(12345) // deterministic output
})

it("generates consistent mock data", () => {
  const user = fake(UserSchema)
  expect(user.name).toBeDefined()
})
```

## Snapshot Testing with JSON Schema

```typescript
it("schema shape has not changed", () => {
  const jsonSchema = z.toJSONSchema(UserSchema)
  expect(jsonSchema).toMatchSnapshot()
})
```

This catches unintended schema changes in code review. The snapshot shows the JSON Schema representation of your Zod schema.

## Integration Testing

### API Handler Testing

```typescript
import request from "supertest"

it("API rejects invalid request body", async () => {
  const response = await request(app)
    .post("/api/users")
    .send({ name: "", email: "invalid" })
    .expect(400)

  expect(response.body.errors).toBeDefined()
  expect(response.body.errors.fieldErrors.email).toBeDefined()
})
```

### Form Validation Testing

```typescript
const FormSchema = z.object({ name: z.string().min(1), email: z.email() })
const formData = { name: "Ada", email: "not-an-email" }

it("form shows validation errors", () => {
  const result = FormSchema.safeParse(formData)
  expect(result.success).toBe(false)
  if (!result.success) {
    const errors = z.flattenError(result.error)
    // Pass errors to form library
    expect(errors.fieldErrors).toHaveProperty("email")
  }
})
```

## Property-Based Testing

A property states a rule that holds for every input. fast-check generates the inputs, reports the seed of a failure, and shrinks a failing input to the smallest case. Build the inputs with fast-check arbitraries so a failure shrinks, and state the rule as a relation between results, not by repeating the schema's logic (rule 10).

```typescript
import fc from "fast-check"

const LineSchema = z.object({
  priceMinor: z.number().int().min(0),
  qty: z.number().int().min(1),
})

const OrderSchema = z
  .object({ lines: z.array(LineSchema).min(1) })
  .transform((order) => ({
    ...order,
    totalMinor: order.lines.reduce((sum, l) => sum + l.priceMinor * l.qty, 0),
  }))

const lineArb = fc.record({
  priceMinor: fc.integer({ min: 0, max: 100_000 }),
  qty: fc.integer({ min: 1, max: 20 }),
})
const linesArb = fc.array(lineArb, { minLength: 1, maxLength: 30 })

const totalOf = (lines: z.input<typeof LineSchema>[]) => {
  const result = OrderSchema.safeParse({ lines })
  expect(result.success).toBe(true)
  return result.data!.totalMinor
}

it("one unit costs its price", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 100_000 }), (priceMinor) => {
      expect(totalOf([{ priceMinor, qty: 1 }])).toBe(priceMinor)
    }),
  )
})

it("a line of quantity n costs the same as n lines of quantity 1", () => {
  fc.assert(
    fc.property(lineArb, (line) => {
      const units = Array.from({ length: line.qty }, () => ({ priceMinor: line.priceMinor, qty: 1 }))
      expect(totalOf([line])).toBe(totalOf(units))
    }),
  )
})

it("the total of two sets of lines is the sum of their totals", () => {
  fc.assert(
    fc.property(linesArb, linesArb, (a, b) => {
      expect(totalOf([...a, ...b])).toBe(totalOf(a) + totalOf(b))
    }),
  )
})

it("any integer age outside 0..150 is rejected", () => {
  fc.assert(
    fc.property(fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: 151 })), (age) => {
      expect(UserSchema.safeParse({ name: "a", email: "a@example.com", age }).success).toBe(false)
    }),
  )
})
```

To check that a schema accepts its own generated data, let fast-check choose the faker's seed. A failure then
reports a seed that reproduces the data; it does not shrink.

```typescript
import { fake, seed } from "zod-schema-faker/v4"

it("schema accepts its own generated data", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (s) => {
      seed(s)
      expect(UserSchema.safeParse(fake(UserSchema)).success).toBe(true)
    }),
    { numRuns: 200 },
  )
})
```

Never write `fc.property(fc.constant(null), ...)`: it generates nothing, its counterexample is `[null]`, and the
data that failed is lost.

## Rules

1. **Assert on `safeParse()` results** — `expect(() => parse()).toThrow()` passes on any error, not only a validation failure
2. **Test both valid and invalid** — don't only test the happy path
3. **Test boundary values** — min, max, min-1, max+1 for numeric constraints
4. **Test optional/nullable combinations** — undefined, null, missing key
5. **Assert specific error fields** — use `z.flattenError()` to check which field failed
6. **Don't test schema internals** — test parse results, not `.shape` or `._def`
7. **Use `z.toJSONSchema()` snapshots** — catch unintended schema changes
8. **Seed random generators** — take randomness from fast-check, or from a seed fast-check chooses, so a failure replays; non-deterministic tests are flaky tests
9. **Test transforms separately** — verify input validation AND output conversion
10. **Don't duplicate schema logic in assertions** — test behavior, not implementation

## Anti-Patterns

See [testing-anti-patterns.md](testing-anti-patterns.md) for BAD/GOOD examples of:

- Testing schema internals instead of behavior
- Not testing error paths
- Using `parse()` with `toThrow()` in tests (passes on any error)
- Not testing boundary values
- Hardcoding mock data instead of generating
- A property over a constant (`fc.constant(null)`), which generates nothing
- Snapshot testing raw ZodError instead of formatted output
- Not testing at boundaries (schema tests pass but handler doesn't validate)
- No snapshot regression testing (field removal goes unnoticed)
- Testing schema shape but not error observability (never assert on flattenError)
- No drift detection workflow (schema changes land without mechanical review)

## References

- [API Reference](testing-api.md) — Testing patterns, assertion helpers, mock generation
- [Anti-Patterns](testing-anti-patterns.md) — Common testing mistakes to avoid
