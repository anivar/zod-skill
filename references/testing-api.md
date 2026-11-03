# Zod Testing API Reference

Checked against Zod 4.6.7, Vitest 5.1, fast-check 4 and zod-schema-faker 3.

## Schema Correctness Testing

### safeParse() for Tests

Assert on `safeParse()` results. `expect(() => schema.parse(data)).toThrow()` passes on any thrown error, such as a `TypeError` from a bug in a transform, so it does not prove that validation rejected the input.

```typescript
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.int().min(0).max(150),
})

// GOOD: assertion-based
const result = UserSchema.safeParse(data)
expect(result.success).toBe(false)
expect(result.error?.issues.map((i) => i.code)).toContain("invalid_type")

// GOOD: a yes or no only
expect(UserSchema.validate(data)).toBe(false)

// BAD: passes on any error
expect(() => UserSchema.parse(data)).toThrow()
```

### Testing Valid Data

```typescript
describe("UserSchema", () => {
  const validUsers = [
    { name: "Alice", email: "alice@example.com", age: 30 },
    { name: "B", email: "b@c.co", age: 0 },
    { name: "Zed", email: "zed+tag@domain.org", age: 150 },
  ]

  it.each(validUsers)("accepts valid user: $name", (user) => {
    const result = UserSchema.safeParse(user)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(user)
    }
  })
})
```

### Testing Invalid Data

```typescript
const invalidInputs = [
  { input: {}, desc: "empty object" },
  { input: { name: "" }, desc: "empty name" },
  { input: { name: "A", email: "bad" }, desc: "invalid email" },
  { input: { name: "A", email: "a@b.com", age: -1 }, desc: "negative age" },
  { input: { name: "A", email: "a@b.com", age: 151 }, desc: "age over max" },
]

it.each(invalidInputs)("rejects $desc", ({ input }) => {
  expect(UserSchema.safeParse(input).success).toBe(false)
})
```

### Boundary Value Testing

```typescript
const NumberSchema = z.number().min(0).max(100)

const boundaries = [
  { value: 0, expected: true, desc: "minimum" },
  { value: 100, expected: true, desc: "maximum" },
  { value: -1, expected: false, desc: "below minimum" },
  { value: 101, expected: false, desc: "above maximum" },
  { value: -0.001, expected: false, desc: "fractionally below min" },
  { value: 100.001, expected: false, desc: "fractionally above max" },
]

it.each(boundaries)("$desc ($value) → $expected", ({ value, expected }) => {
  expect(NumberSchema.safeParse(value).success).toBe(expected)
})
```

### Optional and Nullable Testing

```typescript
const Schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  both: z.string().optional().nullable(),
})

it("accepts all optional/nullable combinations", () => {
  expect(Schema.safeParse({ required: "a" }).success).toBe(true)
  expect(Schema.safeParse({ required: "a", optional: undefined }).success).toBe(true)
  expect(Schema.safeParse({ required: "a", nullable: null }).success).toBe(true)
  expect(Schema.safeParse({ required: "a", both: null }).success).toBe(true)
  expect(Schema.safeParse({ required: "a", both: undefined }).success).toBe(true)
})

it("rejects null for non-nullable", () => {
  expect(Schema.safeParse({ required: "a", optional: null }).success).toBe(false)
})

it("rejects undefined for non-optional", () => {
  expect(Schema.safeParse({ required: undefined }).success).toBe(false)
})
```

## Error Assertion Patterns

### Using z.flattenError()

```typescript
it("reports field-level errors", () => {
  const result = UserSchema.safeParse({ name: "", email: "bad", age: -1 })
  expect(result.success).toBe(false)
  if (!result.success) {
    const flat = z.flattenError(result.error)
    expect(flat.fieldErrors).toHaveProperty("email")
    expect(flat.fieldErrors).toHaveProperty("age")
  }
})
```

### Asserting Error Messages

```typescript
it("shows custom error message", () => {
  const Schema = z.string({ error: "Name is required" })
  const result = Schema.safeParse(undefined)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].message).toBe("Name is required")
  }
})
```

### Asserting Error Codes

```typescript
it("produces invalid_type for wrong type", () => {
  const result = z.number().safeParse("string")
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].code).toBe("invalid_type")
  }
})

it("produces too_small for under minimum", () => {
  const result = z.number().min(5).safeParse(3)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].code).toBe("too_small")
  }
})
```

### Asserting Error Paths

```typescript
const FormSchema = z
  .object({ password: z.string().min(8), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "Passwords don't match", path: ["confirm"] })

it("targets the correct field", () => {
  const result = FormSchema.safeParse({
    password: "12345678",
    confirm: "different",
  })
  expect(result.success).toBe(false)
  if (!result.success) {
    const confirmError = result.error.issues.find(
      (i) => i.path.join(".") === "confirm"
    )
    expect(confirmError).toBeDefined()
    expect(confirmError!.message).toBe("Passwords don't match")
  }
})
```

### Counting Errors

```typescript
it("reports all validation errors at once", () => {
  const result = UserSchema.safeParse({})
  expect(result.success).toBe(false)
  if (!result.success) {
    // Zod reports all issues, not just the first
    expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
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
import { fake, seed, setFaker } from "zod-schema-faker/v4"
import * as z from "zod"

// Call once in test setup (beforeAll or setupFiles)
setFaker(faker)

const UserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "user", "guest"]),
})

describe("with generated data", () => {
  beforeEach(() => seed(42)) // deterministic

  it("schema accepts its own generated data", () => {
    const user = fake(UserSchema)
    expect(UserSchema.safeParse(user).success).toBe(true)
  })

  it("generates array of valid items", () => {
    const users = Array.from({ length: 10 }, () => fake(UserSchema))
    users.forEach((u) => {
      expect(UserSchema.safeParse(u).success).toBe(true)
    })
  })
})
```

### Not @anatine/zod-mock

`@anatine/zod-mock` supports Zod 3 only: its latest release (3.14.0) declares `zod ^3.21.4`, and on a Zod 4
schema `generateMock()` returns `undefined`. Use `zod-schema-faker/v4`.

## Snapshot Testing

### JSON Schema Snapshots

```typescript
it("schema shape matches snapshot", () => {
  const jsonSchema = z.toJSONSchema(UserSchema)
  expect(jsonSchema).toMatchSnapshot()
})
```

Update snapshots when schema changes are intentional:
```bash
vitest --update  # or jest --updateSnapshot
```

### Formatted Error Snapshots

```typescript
it("error output matches snapshot", () => {
  const result = UserSchema.safeParse({ name: 123, email: "bad" })
  expect(result.success).toBe(false)
  if (!result.success) {
    const flat = z.flattenError(result.error)
    expect(flat).toMatchSnapshot()
  }
})
```

## Integration Testing

### Express/Fastify API Handler

```typescript
import request from "supertest"

it("validates request body", async () => {
  const res = await request(app)
    .post("/api/users")
    .send({ name: "", email: "invalid" })
    .expect(400)

  expect(res.body.errors.fieldErrors).toHaveProperty("email")
})

it("accepts valid request", async () => {
  const res = await request(app)
    .post("/api/users")
    .send({ name: "Alice", email: "alice@example.com", age: 30 })
    .expect(201)

  expect(res.body.id).toBeDefined()
})
```

### Form Validation

```typescript
const formData = { password: "12345678", confirm: "different" }

it("produces form-compatible errors", () => {
  const result = FormSchema.safeParse(formData)
  expect(result.success).toBe(false)
  if (!result.success) {
    const errors = z.flattenError(result.error)
    // Structure matches what form libraries expect
    expect(errors).toEqual({
      formErrors: expect.any(Array),
      fieldErrors: expect.objectContaining({
        confirm: expect.any(Array),
      }),
    })
  }
})
```

### Database Layer

Call the code under test with a mock store, then assert on the mock. A test that only parses and then checks a mock it never passed anywhere proves nothing.

```typescript
type User = z.infer<typeof UserSchema>

async function saveUser(input: unknown, store: { insert(user: User): Promise<void> }) {
  const result = UserSchema.safeParse(input)
  if (!result.success) return { ok: false as const, error: result.error }
  await store.insert(result.data)
  return { ok: true as const }
}

it("does not insert invalid data", async () => {
  const store = { insert: vi.fn(async (_user: User) => {}) }
  const outcome = await saveUser({ name: "", email: "bad" }, store)
  expect(outcome.ok).toBe(false)
  expect(store.insert).not.toHaveBeenCalled()
})
```

## Property-Based Testing

### With fast-check

```bash
npm install -D fast-check
```

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

### Transform Output Testing

```typescript
const InputSchema = z.object({ cents: z.string().regex(z.regexes.integer) })
const OutputSchema = z.object({ cents: z.int() })
const Transformed = InputSchema.transform((v) => ({ cents: Number(v.cents) }))

it("transform output satisfies the output schema", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (s) => {
      seed(s)
      const result = Transformed.safeParse(fake(InputSchema))
      expect(result.success).toBe(true) // a generated input that does not parse fails the test
      expect(OutputSchema.safeParse(result.data).success).toBe(true)
    }),
  )
})
```

## Async Schema Testing

```typescript
it("validates async refinements", async () => {
  const UniqueEmail = z.email().refine(
    async (email) => !(await db.exists(email)),
    { error: "Already registered" }
  )

  // Must use safeParseAsync
  const result = await UniqueEmail.safeParseAsync("taken@example.com")
  expect(result.success).toBe(false)
})
```

## Test Helpers

### reusable assertion helper

```typescript
function expectValid<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(
      `Expected valid but got errors:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}

function expectInvalid(schema: z.ZodType, data: unknown) {
  const result = schema.safeParse(data)
  expect(result.success).toBe(false)
  if (!result.success) return result.error
  throw new Error("Expected invalid but data was accepted")
}

// Usage
const validData = { name: "Alice", email: "alice@example.com", age: 30 }

it("accepts valid user", () => {
  const user = expectValid(UserSchema, validData)
  expect(user.name).toBe("Alice")
})

it("rejects invalid email", () => {
  const error = expectInvalid(UserSchema, { ...validData, email: "bad" })
  expect(error.issues[0].path).toEqual(["email"])
})
```

## Structural Testing

### Schema Dependency Direction

Assert that schemas are imported from boundary layers, not from domain code. This enforces the architectural rule that parsing happens at boundaries.

```typescript
import { execSync } from "node:child_process"

describe("schema architecture", () => {
  it("domain layer does not import raw schemas", () => {
    // grep for Zod schema imports in domain code
    const result = execSync(
      'grep -r "from.*schemas" src/domain/ || true',
      { encoding: "utf-8" }
    )
    // Domain should only import types (z.infer), not raw schemas
    const rawImports = result
      .split("\n")
      .filter((line) => line && !line.includes("type {") && !line.includes("type{"))
    expect(rawImports).toHaveLength(0)
  })
})
```

### Circular Import Detection

Use madge to detect circular dependencies between schema files:

```typescript
import madge from "madge"

describe("schema dependencies", () => {
  it("has no circular dependencies", async () => {
    const result = await madge("src/", {
      fileExtensions: ["ts"],
      tsConfig: "tsconfig.json",
    })
    const circular = result.circular()
    expect(circular).toHaveLength(0)
  })
})
```

## Drift Detection

### JSON Schema Snapshot Workflow

Export schemas as JSON Schema and commit snapshots. CI fails when schemas change without updating snapshots.

```typescript
// scripts/export-schemas.ts
import * as z from "zod"
import { writeFileSync, mkdirSync } from "node:fs"
import { UserSchema, OrderSchema } from "../src/api/schemas"

const schemas = { User: UserSchema, Order: OrderSchema }

mkdirSync("snapshots", { recursive: true })
for (const [name, schema] of Object.entries(schemas)) {
  writeFileSync(
    `snapshots/${name}.json`,
    JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n"
  )
}
```

### Snapshot Test

```typescript
import { readFileSync } from "node:fs"

describe("schema drift detection", () => {
  it("UserSchema matches committed snapshot", () => {
    const current = z.toJSONSchema(UserSchema)
    const committed = JSON.parse(
      readFileSync("snapshots/User.json", "utf-8")
    )
    expect(current).toEqual(committed)
  })
})
```

### CI Integration

```yaml
# .github/workflows/schema-check.yml
- run: npx tsx scripts/export-schemas.ts
- name: Check for schema drift
  run: |
    if git diff --exit-code snapshots/; then
      echo "Schemas unchanged"
    else
      echo "::error::Schema snapshots changed. Update snapshots if intentional."
      git diff snapshots/
      exit 1
    fi
```

## Observable Error Testing

### Assert flattenError Structure

Test that validation errors produce the expected structured output for logging and monitoring.

```typescript
describe("error observability", () => {
  it("flattenError has expected field keys", () => {
    const result = UserSchema.safeParse({ name: "", email: "bad" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const flat = z.flattenError(result.error)
      // Verify structure matches what logging expects
      expect(flat).toHaveProperty("formErrors")
      expect(flat).toHaveProperty("fieldErrors")
      expect(flat.fieldErrors).toHaveProperty("email")
    }
  })

  it("error messages are user-facing quality", () => {
    const Schema = z.object({
      email: z.email({ error: "Please enter a valid email" }),
      age: z.number({ error: "Age must be a number" }).min(0, "Age cannot be negative"),
    })

    const result = Schema.safeParse({ email: "bad", age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const flat = z.flattenError(result.error)
      expect(flat.fieldErrors.email![0]).toBe("Please enter a valid email")
      expect(flat.fieldErrors.age![0]).toBe("Age cannot be negative")
    }
  })
})
```

## Performance Testing

Do not assert a wall-clock threshold in a unit test: the time moves between identical runs on shared CI machines, so the test fails at random. Use a benchmark and read the comparison.

### With Vitest Bench

Vitest 5 runs benchmarks inside tests: the test context carries `bench`, and `bench.compare()` runs the registrations and reports them. The `bench` fixture works only in files that match `benchmark.include` (by default `*.bench.ts`); in a `*.test.ts` file it throws. Vitest marks the API experimental (vitest.dev/guide/benchmarking). Checked with Vitest 5.1.

```typescript
// schema.bench.ts
test("compares validate() with safeParse() on invalid input", async ({ bench }) => {
  const invalidUser = { name: 123 }

  await bench.compare(
    bench("safeParse", () => {
      UserSchema.safeParse(invalidUser)
    }),
    bench("validate", () => {
      UserSchema.validate(invalidUser)
    }),
  )
})
```

Run with:
```bash
vitest bench --run
```

With Vitest 4 and earlier, import `bench` from `"vitest"` as a top-level function instead.
