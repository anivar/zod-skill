---
title: "Use safeParse() for User Input (Zod 3)"
impact: CRITICAL
description: Use safeParse() instead of parse() in Zod 3 too. Read result.error.issues, not the .errors alias, and type a wrapper's result with z.SafeParseReturnType.
tags: parsing, safeParse, error-handling, zod3
---

# Use safeParse() for User Input (Zod 3)

Zod 4 form: `rules/parse-use-safeParse.md`. The rule is the same; two names differ.

## Problem

`parse()` throws a `ZodError`. In Zod 3 the error exposes the issues twice, as `.issues` and as the alias `.errors`. Zod 4 removes the alias, so code that reads `.errors` breaks on the day the file moves to `zod/v4`.

## Incorrect

```typescript
const UserSchema = z.object({ name: z.string(), email: z.string().email() })

// BUG: try/catch is verbose and catches unrelated errors; .errors is an alias Zod 4 removes
function validateInput(data: unknown) {
  try {
    return { success: true, data: UserSchema.parse(data) }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, errors: e.errors }
    }
    throw e
  }
}
```

## Correct

```typescript
function validateInput(data: unknown) {
  const result = UserSchema.safeParse(data)
  if (!result.success) {
    return { success: false, errors: result.error.issues }
  }
  return { success: true, data: result.data }
}

// The result type, when a wrapper needs to name it
type UserResult = z.SafeParseReturnType<z.input<typeof UserSchema>, z.output<typeof UserSchema>>
```

## Why

`safeParse()` returns the same discriminated union in both versions. `.issues` is the one name that survives the migration; `.errors` is the same array under a name that Zod 4 drops. The result type is `z.SafeParseReturnType<Input, Output>` in Zod 3 and `z.ZodSafeParseResult<T>` in Zod 4. Zod 3 has no `.validate()`; a yes-or-no check reads `.safeParse(x).success` (`v3/rules/parse-validate-boolean.md`).
