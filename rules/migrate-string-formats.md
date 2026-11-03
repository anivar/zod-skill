---
title: "v4: Top-Level String Formats"
impact: MEDIUM
description: Use top-level z.email(), z.uuid(), z.url() instead of the deprecated z.string().email() methods.
tags: migration, v4, string, email, uuid, url, formats
---

# v4: Top-Level String Formats

## Problem

Zod 4 moved the string formats to top-level functions. The method forms such as `z.string().email()` still work, and their type definitions mark them deprecated (zod.dev/v4/changelog).

## Incorrect

```typescript
// BAD: method forms from Zod 3
const Email = z.string().email() // deprecated: use z.email()
const Url = z.string().url() // deprecated: use z.url()
const Uuid = z.string().uuid() // deprecated: use z.uuid()
const Cuid = z.cuid() // deprecated: CUID v1 leaks information; use z.cuid2()
```

## Correct

```typescript
const Email = z.email()
const Url = z.url()
const HttpUrl = z.httpUrl() // http or https, with a valid domain
const Uuid = z.uuid() // RFC 9562 variant bits; z.guid() for any 8-4-4-4-12 hex string
const Cuid2 = z.cuid2()
const Ulid = z.ulid()
const Ipv4 = z.ipv4()
const Cidrv6 = z.cidrv6()
const Jwt = z.jwt()
const Base64url = z.base64url() // no padding
const IsoDate = z.iso.date()
const IsoDateTime = z.iso.datetime() // seconds required since Zod 4.5
```

## Why

Each format is its own schema type, and the top-level form is shorter and tree-shakes better. `z.uuid()` checks the RFC 9562 variant bits; it accepts every version unless you pass `{ version }` or use `z.uuidv4()`, `z.uuidv7()`. `z.string().ip()` and `z.string().cidr()` are removed; use `z.ipv4()`/`z.ipv6()` and `z.cidrv4()`/`z.cidrv6()`, or a union. The full list is in `references/schema-types.md`.
