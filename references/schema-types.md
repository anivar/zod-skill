# Schema Types Reference

Docs: zod.dev/api · Zod 4.6.7

## Primitives

```typescript
z.string()     // string
z.number()     // finite number: rejects NaN, Infinity and -Infinity
z.boolean()    // boolean
z.bigint()     // bigint
z.date()       // Date instance; rejects an invalid Date
z.symbol()     // symbol
z.undefined()  // undefined
z.null()       // null
z.void()       // undefined, typed as void
z.nan()        // NaN only
z.any()        // any — bypasses type checking
z.unknown()    // unknown — safer than any
z.never()      // never — always fails
```

## Strings

### Constraints

```typescript
z.string().min(5)           // minimum length
z.string().max(100)         // maximum length
z.string().length(10)       // exact length
z.string().regex(/^[a-z]+$/) // regex pattern
z.string().startsWith("https://")
z.string().endsWith(".com")
z.string().includes("@")
z.string().lowercase()      // check: no uppercase characters
z.string().uppercase()      // check: no lowercase characters

// Overwrites: change the value without changing the type
z.string().trim()
z.string().toLowerCase()
z.string().toUpperCase()
z.string().normalize()      // Unicode normalization
```

### Top-Level String Formats

Each format is its own schema. The method forms (`z.string().email()`) are deprecated.

```typescript
z.email()          // stricter than the RFC, roughly Gmail's rules; pass { pattern } to change it
z.url()            // any WHATWG URL, including "mailto:" and "http://localhost"
z.httpUrl()        // http or https, with a valid domain
z.hostname()
z.uuid()           // RFC 9562 variant bits, any version; z.uuidv4(), z.uuidv6(), z.uuidv7()
z.guid()           // any 8-4-4-4-12 hex string
z.cuid2()
z.ulid()
z.nanoid()
z.emoji()          // one emoji character
z.e164()           // E.164 phone number
z.ipv4()
z.ipv6()
z.mac()
z.cidrv4()
z.cidrv6()
z.base64()
z.base64url()      // no padding
z.hex()
z.jwt()
z.creditCard()     // Luhn checksum
z.currencyCode()   // ISO 4217
z.iban()           // ISO 7064 mod-97 checksum
z.hash("sha256")   // hex digest of the right length; or "sha1", "sha384", "sha512", "md5"
```

For a format Zod does not have, `z.stringFormat()` gives `invalid_format` issues, which name the format, where `.refine()` gives `custom`:

```typescript
const CoolId = z.stringFormat("cool-id", /^cool-[a-z0-9]{8}$/)
CoolId.safeParse("x").error?.issues[0]?.code // "invalid_format"
```

`z.cuid()` still exists and is deprecated: CUID v1 leaks information. Use `z.cuid2()`.

### ISO Date/Time Strings

```typescript
z.iso.date()      // "2024-01-15"
z.iso.time()      // "13:45" or "13:45:30" or "13:45:30.123"; no offsets
z.iso.datetime()  // "2024-01-15T13:45:30Z": seconds required, no offset, no local time
z.iso.datetime({ offset: true })  // also "2024-01-15T13:45:30+02:00"
z.iso.datetime({ local: true })   // also "2024-01-15T13:45" and "2024-01-15T13:45:30"
z.iso.datetime({ precision: 3 })  // exactly milliseconds
z.iso.duration()  // "P3Y6M4DT12H30M5S"
```

Since Zod 4.5, `z.iso.datetime()` requires seconds (zod.dev/blog/zod-4-5). To accept minute precision too, union `z.iso.datetime()` with `z.iso.datetime({ precision: -1 })`. These are string formats; the output stays a string. For a `Date`, use a codec (see `pattern-codecs`).

### Template Literals

```typescript
// Validates strings matching a template pattern
const UserID = z.templateLiteral(["user_", z.string()])
// Matches: "user_abc123", "user_xyz"
// Rejects: "abc123", "admin_xyz"

const CssLength = z.templateLiteral([z.number(), z.enum(["px", "em", "rem"])])
```

## Numbers

```typescript
z.number()                // any finite number
z.int()                   // safe integer: Number.MIN_SAFE_INTEGER..Number.MAX_SAFE_INTEGER
z.int32()                 // 32-bit signed integer range
z.uint32()                // 32-bit unsigned integer range
z.float32()               // float32 range
z.float64()               // float64 range
z.int64()                 // bigint in the int64 range
z.uint64()                // bigint in the uint64 range

// Constraints
z.number().min(0)         // >= 0 (alias .gte)
z.number().max(100)       // <= 100 (alias .lte)
z.number().gt(0)          // > 0
z.number().lt(100)        // < 100
z.number().positive()     // > 0
z.number().negative()     // < 0
z.number().nonnegative()  // >= 0
z.number().nonpositive()  // <= 0
z.number().multipleOf(5)  // divisible by 5 (alias .step)
```

`.finite()` and `.safe()` are deprecated: `z.number()` already rejects infinite values, and `.safe()` is the same as `.int()`. There is no `z.float()`.

## BigInt

```typescript
z.bigint()
z.bigint().min(0n)
z.bigint().max(100n)
z.bigint().positive()
z.bigint().negative()
z.bigint().nonnegative()
z.bigint().nonpositive()
z.bigint().multipleOf(5n)
```

## Boolean

```typescript
z.boolean()        // true or false
z.literal(true)    // only true
z.literal(false)   // only false
```

## Date

```typescript
z.date()                           // Date instance
z.date().min(new Date("2020-01-01")) // on or after
z.date().max(new Date("2030-01-01")) // on or before
```

## Enums

```typescript
// String literal array
z.enum(["active", "inactive", "pending"])

// TypeScript enum: z.enum() replaces the deprecated z.nativeEnum()
enum Status {
  Active = "active",
  Inactive = "inactive",
}
z.enum(Status)

// Numeric enum: .options is [0, 1, 2] since Zod 4.6
enum Priority {
  Low = 0,
  Medium = 1,
  High = 2,
}
z.enum(Priority)
```

## Stringbool

Converts string boolean representations to actual booleans.

```typescript
z.stringbool()
// Accepts, case-insensitively: "true"/"false", "1"/"0", "yes"/"no", "on"/"off", "y"/"n", "enabled"/"disabled"
// Returns: boolean

z.stringbool().parse("true")   // true
z.stringbool().parse("false")  // false
z.stringbool().parse("1")      // true
z.stringbool().parse("0")      // false

// Custom sets
z.stringbool({ truthy: ["ja"], falsy: ["nein"] })
```

## Literals

```typescript
z.literal("hello")   // exactly "hello"
z.literal(42)        // exactly 42
z.literal(true)      // exactly true
z.literal(null)      // exactly null
z.literal(undefined) // exactly undefined
z.literal(100n)      // exactly 100n (bigint)
z.literal(["red", "green"]) // either value
```

## Files

```typescript
z.file()                                 // File instance
z.file().min(1024)                       // minimum .size in bytes
z.file().max(5 * 1024 * 1024)            // maximum .size (5 MB)
z.file().mime("image/png")               // MIME type
z.file().mime(["image/png", "image/jpeg"]) // one of several MIME types
```

The docs show no wildcard such as `"image/*"`; list the types.

## JSON

`z.json()` validates a JSON-encodable value: a string, number, boolean, null, array or plain object of those. It does not parse a JSON string.

```typescript
z.json().parse({ name: "Alice", tags: ["a"] }) // { name: "Alice", tags: ["a"] }
z.json().parse('{"name":"Alice"}')             // the same string, unparsed
z.json().safeParse(new Date()).success         // false
```

To parse a JSON string into a typed value, use the `jsonCodec` recipe from zod.dev/codecs.

## Custom Types

```typescript
// Custom type with validation function
const NonEmptyString = z.custom<string>(
  (val) => typeof val === "string" && val.length > 0,
  { error: "Must be a non-empty string" }
)
// Without a function, z.custom<T>() accepts any value and only sets the type
```

`z.instanceof(Class)` checks `instanceof`:

```typescript
const ErrorSchema = z.instanceof(Error)
ErrorSchema.safeParse(new Error("test")).success // true
ErrorSchema.safeParse("not an error").success    // false
```

## Functions

`z.function()` is not a schema in Zod 4. It builds a wrapper that validates the arguments and the return value of an implementation.

```typescript
const LongerThan = z.function({
  input: [z.string(), z.number()], // parameters: an array or a z.tuple()
  output: z.boolean(),
})

const longerThan = LongerThan.implement((s, n) => s.length > n)
longerThan("abc", 1) // true; bad arguments or a bad return value throw
```

The Zod 3 form `z.function(args, returns)` does not type-check. A call with bad arguments throws `z.core.$ZodError`; on 4.6.7 `instanceof z.ZodError` is `false` for it. Use `.implementAsync()` for an async implementation.

## Branded Types

`.brand<"Name">()` adds a type-only brand, so two structurally identical types do not mix. The only way to get a branded value is to parse it.

```typescript
const USD = z.number().brand<"USD">()
const EUR = z.number().brand<"EUR">()
type USD = z.infer<typeof USD> // number & z.$brand<"USD">

function pay(amount: USD) { return amount }
const euros = EUR.parse(100)
// @ts-expect-error EUR is not assignable to USD
pay(euros)

const UserId = z.string().brand<"UserId">()
const Slug = z.string().regex(/^[a-z0-9-]+$/).brand<"Slug">()
```

## Optional, Nullable, Nullish

```typescript
z.string().optional()   // string | undefined
z.string().nullable()   // string | null
z.string().nullish()    // string | null | undefined
```

## Coercion

```typescript
z.coerce.string()   // String(input)
z.coerce.number()   // Number(input): "0x50" → 80, "" → 0
z.coerce.boolean()  // Boolean(input) — careful: Boolean("false") === true; use z.stringbool()
z.coerce.bigint()   // BigInt(input)
z.coerce.date()     // new Date(input)
```

The input type of a coerced schema is `unknown`. Pass a type argument to narrow it: `z.coerce.number<string>()`.
