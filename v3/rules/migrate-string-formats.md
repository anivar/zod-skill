---
title: "String Formats Are Methods (Zod 3)"
impact: MEDIUM
description: In a Zod 3 file the string formats are methods on z.string(): .email(), .url(), .uuid(), .ip(), .cidr(), .datetime(). The top-level z.email() form does not exist until the file imports zod/v4.
tags: migration, string, email, uuid, url, formats, zod3
---

# String Formats Are Methods (Zod 3)

Zod 4 form: `rules/migrate-string-formats.md`, whose "Incorrect" block is the correct Zod 3 code.

## Problem

Zod 4 moves the string formats to top-level functions and deprecates the method forms. A Zod 3 file has only the methods; `z.email()` is not a function there.

## Incorrect

```typescript
// @ts-expect-error z.email() does not exist in Zod 3
const Email = z.email()
```

## Correct

```typescript
const Email = z.string().email()
const Url = z.string().url()
const Uuid = z.string().uuid()
const Cuid2 = z.string().cuid2()
const Ulid = z.string().ulid()
const Ip = z.string().ip() // v4 or v6; { version: "v4" } for one
const Cidr = z.string().cidr()
const Emoji = z.string().emoji()
const Base64 = z.string().base64()
const IsoDate = z.string().date()
const IsoDateTime = z.string().datetime() // "Z" only by default; { offset: true } accepts +02:00
const IsoDateTimeWhole = z.string().datetime({ precision: 0 }) // rejects fractional seconds; still accepts a time without seconds
```

## Why

The method forms are the Zod 3 API. They keep compiling after a move to `zod/v4` as deprecated methods, so the rewrite to `z.email()` can follow the move. Two checks are looser in Zod 3 than their Zod 4 equivalents: `.datetime()` accepts a time without seconds, and `.uuid()` accepts any variant bits (V15); `.ip()` and `.cidr()` accept both address families, where Zod 4 splits them into `z.ipv4()`, `z.ipv6()`, `z.cidrv4()` and `z.cidrv6()`.
