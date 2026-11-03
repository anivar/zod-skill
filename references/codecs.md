# Codecs Reference

Docs: zod.dev/codecs, zod.dev/blog/zod-4-5 · Zod 4.6.7

A codec is a schema with a transform in each direction. Decoding converts the input type to the output type: `.decode()` does at runtime what `.parse()` does. Encoding converts the output type back to the input type. Use a codec where a value crosses a boundary in both directions: an API request and response, a database row, a form value, a query string.

## Define a Codec

```typescript
const isoDatetimeToDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (isoString) => new Date(isoString), // string → Date
  encode: (date) => date.toISOString(),       // Date → string
})

const parsed = isoDatetimeToDate.decode("2024-01-15T10:30:00.000Z") // Date
const serialized = isoDatetimeToDate.encode(parsed)                 // "2024-01-15T10:30:00.000Z"
```

A codec is a schema like any other. Nest it in objects, arrays and pipes.

```typescript
const Payload = z.object({ startDate: isoDatetimeToDate })

Payload.decode({ startDate: "2024-01-15T10:30:00.000Z" }) // { startDate: Date }
Payload.encode({ startDate: new Date() })                  // { startDate: string }
```

## Typed Input

`.parse()` takes `unknown`. `.decode()` takes the input type and `.encode()` takes the output type, so TypeScript finds a wrong argument.

```typescript
isoDatetimeToDate.parse(12345) // compiles; fails at runtime

// @ts-expect-error a number is not a string
isoDatetimeToDate.decode(12345)

// @ts-expect-error a number is not a Date
isoDatetimeToDate.encode(12345)
```

## Methods and Functions

| Method | Top-level function | Returns |
|---|---|---|
| `.decode(input)` | `z.decode(schema, input)` | the output, or throws `ZodError` |
| `.encode(output)` | `z.encode(schema, output)` | the input, or throws `ZodError` |
| `.safeDecode()`, `.safeEncode()` | `z.safeDecode()`, `z.safeEncode()` | `{ success, data }` or `{ success, error }` |
| `.decodeAsync()`, `.encodeAsync()` | `z.decodeAsync()`, `z.encodeAsync()` | a `Promise` |
| `.safeDecodeAsync()`, `.safeEncodeAsync()` | `z.safeDecodeAsync()`, `z.safeEncodeAsync()` | a `Promise` of the safe result |

`z.decode()` and `z.encode()` work with any schema, not only with a codec. A codec can have async `decode` and `encode` functions; use the async methods with it.

## What Runs in Each Direction

| Part of the schema | Decode | Encode |
|---|---|---|
| `z.codec(A, B, ...)` | parse with `A`, run `decode`, parse with `B` | encode with `B`, run `encode`, encode with `A` |
| `.pipe()` from `A` to `B` | `A`, then `B` | `B`, then `A` |
| Checks and `.refine()` | run | run, after a first pass that checks only the types |
| Overwrites such as `.trim()` | run | run |
| `.default()` and `.prefault()` | apply to `undefined` | do not apply: `undefined` fails |
| `.catch()` | applies | does not apply |
| `z.stringbool()` | string to boolean | `true` to the first truthy value, `false` to the first falsy value (`"true"` and `"false"` by default) |
| `.transform()` | runs | throws `$ZodEncodeError`, a plain error, not a `ZodError` |

```typescript
const WithDefault = z.string().default("hello")
WithDefault.decode(undefined)                        // "hello"
WithDefault.safeEncode(undefined as never).success   // false: defaults are decode-only

z.stringbool({ truthy: ["yes", "y"], falsy: ["no", "n"] }).encode(false) // "no"
```

A schema that contains a `.transform()` cannot encode. Replace the transform with a codec when the value must go back out.

## Invert a Codec

`z.invertCodec()` swaps the input and output schemas and the two functions. It inverts only the codec you pass; codecs nested inside another schema keep their direction.

```typescript
const dateToIsoDatetime = z.invertCodec(isoDatetimeToDate)

dateToIsoDatetime.decode(new Date("2024-01-15T10:30:00.000Z")) // "2024-01-15T10:30:00.000Z"
dateToIsoDatetime.encode("2024-01-15T10:30:00.000Z")           // Date
```

## Validate One Side: `z.input()` and `z.output()`

`z.input(schema)` and `z.output(schema)` give a schema for one side of the codecs and pipes inside `schema`. Use them to check the wire form and the rich form separately. On a schema without codecs or pipes they change nothing.

```typescript
const Event = z.object({ name: z.string(), at: isoDatetimeToDate })

z.input(Event).safeParse({ name: "launch", at: "2024-01-01T00:00:00Z" }).success // true
z.output(Event).safeParse({ name: "launch", at: new Date() }).success           // true
z.input(Event).safeParse({ name: "launch", at: new Date() }).success            // false
```

## Codecs vs Transforms

| | `.transform()` | `z.codec()` |
|---|---|---|
| Direction | One way: input to output | Both ways |
| Use when | You only parse | You parse and serialize |
| `.encode()` | Throws `$ZodEncodeError` | Runs the `encode` function |

## Recipes

Zod does not export these codecs. The docs call them recipes to copy into your code and change as needed. The check runs every recipe in this block against the examples below it.

```typescript
const stringToNumber = z.codec(z.string().regex(z.regexes.number), z.number(), {
  decode: (str) => Number.parseFloat(str),
  encode: (num) => num.toString(),
})

const stringToInt = z.codec(z.string().regex(z.regexes.integer), z.int(), {
  decode: (str) => Number.parseInt(str, 10),
  encode: (num) => num.toString(),
})

const stringToBigInt = z.codec(z.string(), z.bigint(), {
  decode: (str) => BigInt(str),
  encode: (bigint) => bigint.toString(),
})

const numberToBigInt = z.codec(z.int(), z.bigint(), {
  decode: (num) => BigInt(num),
  encode: (bigint) => Number(bigint),
})

const epochSecondsToDate = z.codec(z.int().min(0), z.date(), {
  decode: (seconds) => new Date(seconds * 1000),
  encode: (date) => Math.floor(date.getTime() / 1000),
})

const epochMillisToDate = z.codec(z.int().min(0), z.date(), {
  decode: (millis) => new Date(millis),
  encode: (date) => date.getTime(),
})

const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString)
      } catch (err) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err instanceof Error ? err.message : "Invalid JSON",
        })
        return z.NEVER
      }
    },
    encode: (value) => JSON.stringify(value),
  })

const utf8ToBytes = z.codec(z.string(), z.instanceof(Uint8Array), {
  decode: (str) => new TextEncoder().encode(str),
  encode: (bytes) => new TextDecoder().decode(bytes),
})

const bytesToUtf8 = z.codec(z.instanceof(Uint8Array), z.string(), {
  decode: (bytes) => new TextDecoder().decode(bytes),
  encode: (str) => new TextEncoder().encode(str),
})

const base64ToBytes = z.codec(z.base64(), z.instanceof(Uint8Array), {
  decode: (base64String) => z.util.base64ToUint8Array(base64String),
  encode: (bytes) => z.util.uint8ArrayToBase64(bytes),
})

const base64urlToBytes = z.codec(z.base64url(), z.instanceof(Uint8Array), {
  decode: (base64urlString) => z.util.base64urlToUint8Array(base64urlString),
  encode: (bytes) => z.util.uint8ArrayToBase64url(bytes),
})

const hexToBytes = z.codec(z.hex(), z.instanceof(Uint8Array), {
  decode: (hexString) => z.util.hexToUint8Array(hexString),
  encode: (bytes) => z.util.uint8ArrayToHex(bytes),
})

const stringToURL = z.codec(z.url(), z.instanceof(URL), {
  decode: (urlString) => new URL(urlString),
  encode: (url) => url.href,
})

const stringToHttpURL = z.codec(z.httpUrl(), z.instanceof(URL), {
  decode: (urlString) => new URL(urlString),
  encode: (url) => url.href,
})

const uriComponent = z.codec(z.string(), z.string(), {
  decode: (encodedString) => decodeURIComponent(encodedString),
  encode: (decodedString) => encodeURIComponent(decodedString),
})
```

`isoDatetimeToDate` is the first example on this page. The docs' `jsonCodec` catches `err: any`; this copy narrows the error instead, so it compiles under `strict` with `useUnknownInCatchVariables`.

```typescript
stringToNumber.decode("42.5")                    // 42.5
stringToInt.decode("42")                         // 42
stringToInt.safeDecode("12abc").success          // false: the regex rejects it
stringToBigInt.decode("12345")                   // 12345n
numberToBigInt.encode(42n)                       // 42
epochSecondsToDate.decode(1705314600)            // 2024-01-15T10:30:00.000Z
epochMillisToDate.encode(new Date(1705314600000)) // 1705314600000
jsonCodec(z.object({ name: z.string(), age: z.number() })).decode('{"name":"Alice","age":30}') // { name: "Alice", age: 30 }
jsonCodec(z.object({ name: z.string() })).safeDecode("~~invalid~~").success                 // false: invalid_format, format "json"
base64ToBytes.decode("SGVsbG8=")                 // Uint8Array [72, 101, 108, 108, 111]
base64urlToBytes.decode("SGVsbG8")               // Uint8Array [72, 101, 108, 108, 111]
hexToBytes.decode("48656c6c6f")                  // Uint8Array [72, 101, 108, 108, 111]
bytesToUtf8.decode(utf8ToBytes.decode("Hello, 世界!")) // "Hello, 世界!"
stringToURL.encode(new URL("https://example.com")) // "https://example.com/"
stringToHttpURL.safeDecode("mailto:a@b.co").success // false: http or https only
uriComponent.decode("Hello%20World%21")          // "Hello World!"
```
