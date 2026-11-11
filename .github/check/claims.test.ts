// Behaviour claims the skill makes, each proved on the pinned zod, and text guards that fail when a
// corrected claim comes back. Test names carry the audit ids (F, P, S) and
// the ids of later findings (R). V tests prove the Zod 3 statements on the pinned zod3 alias.
//
// Usage: bun test claims.test.ts
//        SKILL_ROOT=<path to another checkout> bun test claims.test.ts   # run the text guards against it
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as z from "zod";
import * as zm from "zod/mini";
import * as z3 from "zod3";
import * as z3v4 from "zod3/v4";
import * as z4v3 from "zod/v3";

const ROOT = resolve(process.env.SKILL_ROOT ?? join(import.meta.dir, "../.."));
const ZOD = dirname(Bun.resolveSync("zod/package.json", import.meta.dir));
const typings = (rel: string) => readFileSync(join(ZOD, rel), "utf8");

type Doc = { file: string; text: string };
const docs: Doc[] = (() => {
  const files = ["SKILL.md", "AGENTS.md", "README.md", "v3/AGENTS.md"].filter((f) => existsSync(join(ROOT, f)));
  for (const dir of ["rules", "references", "v3/rules", "v3/references"]) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of readdirSync(join(ROOT, dir)).sort()) if (f.endsWith(".md")) files.push(`${dir}/${f}`);
  }
  return files.map((file) => ({ file, text: readFileSync(join(ROOT, file), "utf8") }));
})();
// The files under v3/ state Zod 3 facts. A guard against a wrong Zod 4 statement scans the Zod 4 files only.
const isV3 = (d: Doc) => d.file.startsWith("v3/");

// Lines inside ``` fences, with their file and line number.
const codeLines = (d: Doc) => {
  const out: { line: number; text: string }[] = [];
  let inFence = false;
  d.text.split("\n").forEach((text, i) => {
    if (/^\s*```/.test(text)) inFence = !inFence;
    else if (inFence) out.push({ line: i + 1, text });
  });
  return out;
};

// Every match of `pattern` in the skill text. `where` limits the scan to code lines; `scope` "v4" leaves out
// the files under v3/.
function hits(pattern: RegExp, where: "all" | "code" = "all", skipLine?: RegExp, scope: "v4" | "all" = "v4"): string[] {
  const found: string[] = [];
  for (const d of scope === "all" ? docs : docs.filter((d) => !isV3(d))) {
    if (where === "code") {
      for (const l of codeLines(d)) if (pattern.test(l.text) && !skipLine?.test(l.text)) found.push(`${d.file}:${l.line}: ${l.text.trim()}`);
      continue;
    }
    const g = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    const lines = d.text.split("\n");
    for (const m of d.text.matchAll(g)) {
      const line = d.text.slice(0, m.index).split("\n").length;
      if (skipLine?.test(lines[line - 1] ?? "")) continue;
      found.push(`${d.file}:${line}: ${m[0].replace(/\s+/g, " ").slice(0, 100)}`);
    }
  }
  return found;
}

const guard = (id: string, what: string, pattern: RegExp, where: "all" | "code" = "all", skipLine?: RegExp, scope: "v4" | "all" = "v4") =>
  test(`${id} text: ${what}`, () => expect(hits(pattern, where, skipLine, scope)).toEqual([]));

test("the text guards scan the skill", () => {
  expect(docs.some((d) => d.file === "SKILL.md")).toBe(true);
  expect(docs.filter((d) => d.file.startsWith("rules/")).length).toBeGreaterThan(20);
  expect(docs.filter((d) => d.file.startsWith("v3/rules/")).length).toBeGreaterThan(10);
});

describe("F: APIs the skill called wrongly", () => {
  test("F1 z.json() validates a JSON value and does not parse a string", () => {
    expect(z.json().parse('{"name":"Alice"}')).toBe('{"name":"Alice"}');
    expect(z.json().safeParse("invalid json").success).toBe(true);
    expect(z.json().safeParse(new Date()).success).toBe(false);
    expect(z.json().parse({ a: [1, null] })).toEqual({ a: [1, null] });
  });
  guard("F1", "no claim that z.json() parses a JSON string", /valid JSON string, then parses it|z\.json\(\)\.parse\(["']invalid json/i);

  test("F2 z.function takes { input, output }; the Zod 3 form validates nothing", () => {
    const f = z.function({ input: [z.string()], output: z.number() }).implement((s) => s.length);
    expect(f("abc")).toBe(3);
    expect(() => (f as unknown as (n: number) => number)(42)).toThrow();
    const legacy = (z.function as unknown as (a: unknown, b: unknown) => { implement(fn: (...a: unknown[]) => unknown): (...a: unknown[]) => unknown })(
      z.tuple([z.string()]),
      z.boolean(),
    );
    expect(legacy.implement(() => 123)(42)).toBe(123);
  });
  guard("F2", "no Zod 3 z.function(args, returns) form", /z\.function\(\s*z\.tuple/);

  test("F3 registries use .add(); there is no .register() on a registry", () => {
    expect((z.globalRegistry as unknown as Record<string, unknown>).register).toBeUndefined();
    const reg = z.registry<{ label: string }>();
    const s = z.string();
    reg.add(s, { label: "x" });
    expect(reg.get(s)).toEqual({ label: "x" });
    const t = z.number().register(reg, { label: "n" });
    expect(reg.get(t)).toEqual({ label: "n" });
  });
  guard("F3", "no registry.register()", /\b\w*[Rr]egistry\.register\(/);

  test("F4 z.file() checks MIME with .mime(); .type is a string", () => {
    expect(typeof (z.file() as unknown as Record<string, unknown>).type).toBe("string");
    const png = new File(["x"], "a.png", { type: "image/png" });
    expect(z.file().mime("image/png").safeParse(png).success).toBe(true);
    expect(z.file().mime(["image/jpeg"]).safeParse(png).success).toBe(false);
  });
  guard("F4", "no z.file().type()", /z\.file\(\)\.type\(/);

  test("F5 there is no z.float(); z.float32() and z.float64() exist", () => {
    expect((z as unknown as Record<string, unknown>).float).toBeUndefined();
    expect(typeof z.float32).toBe("function");
    expect(typeof z.float64).toBe("function");
  });
  guard("F5", "no z.float() outside a sentence that says it does not exist", /z\.float\(\)/, "all", /no `z\.float\(\)`/);

  test("F6 z.xor takes an array and fails when both branches match", () => {
    const a = z.object({ email: z.email() });
    const b = z.object({ phone: z.string() });
    expect(z.xor([a, b]).safeParse({ phone: "1" }).success).toBe(true);
    expect(z.xor([a, b]).safeParse({ email: "a@b.co", phone: "1" }).success).toBe(false);
    const legacy = (z.xor as unknown as (x: unknown, y: unknown) => z.ZodType)(a, b);
    expect(() => legacy.safeParse({ phone: "1" })).toThrow(/not iterable/);
  });
  guard("F6", "no two-argument z.xor(a, b)", /z\.xor\(\s*(z\.|[A-Z]\w*\s*,)/);

  test("F7 the safeParse result type is ZodSafeParseResult", () => {
    const parse = typings("v4/classic/parse.d.ts");
    expect(parse).toContain("ZodSafeParseResult");
    expect(parse).not.toContain("SafeParseReturnType");
  });
  guard("F7", "no z.SafeParseReturnType", /SafeParseReturnType/);

  test("F8 @standard-schema/spec exports StandardSchemaV1", () => {
    const spec = readFileSync(Bun.resolveSync("@standard-schema/spec", import.meta.dir).replace(/\.js$/, ".d.ts"), "utf8");
    expect(spec).toContain("StandardSchemaV1");
    expect(spec).not.toMatch(/\bStandardSchema\b(?!V1)/);
  });
  guard("F8", "no StandardSchema type import", /\bStandardSchema\b(?!V1)/, "code");

  test("F9 ZodError has .issues and no .errors", () => {
    const err = z.string().safeParse(1).error;
    expect(err?.issues.length).toBe(1);
    expect((err as unknown as Record<string, unknown>).errors).toBeUndefined();
  });
  guard("F9", "no .errors on a ZodError in code", /\b(e|err|error)\.errors\b/, "code");
});

describe("P: claims that something was removed", () => {
  test("P1 z.lazy() still works", () => {
    type Tree = { children: Tree[] };
    const Tree: z.ZodType<Tree> = z.object({ children: z.lazy(() => z.array(Tree)) });
    expect(Tree.safeParse({ children: [{ children: [] }] }).success).toBe(true);
  });
  guard("P1", "no claim that z.lazy() is removed", /z\.lazy\(\)`?\s*(is |was )?removed|lazy\(\)[^\n]{0,20}removed in v4/i);

  test("P2 the message parameter still works", () => {
    expect(z.string().min(5, { message: "MSG" }).safeParse("a").error?.issues[0]?.message).toBe("MSG");
  });
  guard("P2", "no claim that message is removed", /`?message`?,[^.\n]*(are |is )?removed/i);

  test("P3 z.nativeEnum() still runs", () => {
    enum Role { Admin = "admin" }
    expect(z.nativeEnum(Role).safeParse("admin").success).toBe(true); // deprecated: proves it still runs
  });
  guard("P3", "no claim that z.nativeEnum() is gone", /nativeEnum is not a function|removed in v4\s*\n\s*z\.nativeEnum/);

  test("P4 z.formatError() still exists", () => {
    const err = z.object({ a: z.string() }).safeParse({ a: 1 }).error;
    expect(typeof z.formatError).toBe("function");
    expect(err && z.formatError(err)).toHaveProperty("a");
  });
  guard("P4", "no claim that z.formatError() is removed", /Removed in v4/);
});

describe("S: wrong or unsupported statements", () => {
  test("S1 cyclic input parses through a getter schema", () => {
    const Node = z.object({
      name: z.string(),
      get children(): z.ZodArray<typeof Node> {
        return z.array(Node);
      },
    });
    const input: { name: string; children: unknown[] } = { name: "root", children: [] };
    input.children.push(input);
    const out = Node.parse(input);
    expect(out.children[0]).toBe(out);
  });
  guard("S1", "no claim that cyclic data loops forever", /(cyclic|cyclical)[^.\n]*infinite loop/i);

  test("S2 Zod 4 issue codes and union errors", () => {
    expect(z.email().safeParse("x").error?.issues[0]?.code).toBe("invalid_format");
    expect(z.enum(["a"]).safeParse("b").error?.issues[0]?.code).toBe("invalid_value");
    const u = z.union([z.string(), z.number()]).safeParse(true).error?.issues[0];
    expect(u?.code).toBe("invalid_union");
    expect(u).toHaveProperty("errors");
    expect(u).not.toHaveProperty("unionErrors");
  });
  guard("S2", "no Zod 3 issue codes in tables", /^\|\s*`?"?(invalid_string|invalid_enum_value|invalid_arguments|invalid_return_type)"?`?\s*\|/m);
  guard("S2", "no unionErrors", /\bunionErrors\b/);

  test("S3 .default() short-circuits; .prefault() is parsed", () => {
    expect(z.string().min(5).default("ab").parse(undefined)).toBe("ab");
    expect(z.string().min(5).prefault("ab").safeParse(undefined).success).toBe(false);
    expect(z.string().transform((s) => s.length).prefault("tuna").parse(undefined)).toBe(4);
  });
  guard("S3", "no claim that .default() runs after validation", /Applied after validation/i);

  test("S4 Zod Mini has JSON Schema and describe", () => {
    const s = zm.string().check(zm.describe("a name"));
    expect(zm.toJSONSchema(s)).toMatchObject({ type: "string", description: "a name" });
  });
  guard("S4", "no 1.88 kB figure for Zod Mini", /1\.88\s?kb/i);
  guard("S4", "no claim that Zod Mini lacks describe or JSON Schema", /no `?\.describe\(\)`?, no JSON Schema/i);

  test("S5 z.number() rejects Infinity; .safe() is .int(); both are deprecated", () => {
    expect(z.number().safeParse(Infinity).success).toBe(false);
    expect(z.int().safeParse(2 ** 53).success).toBe(false);
    const classic = typings("v4/classic/schemas.d.ts");
    expect(classic).toMatch(/@deprecated[^\n]*\n\s*finite\(/);
    expect(classic).toMatch(/@deprecated[^\n]*\n\s*safe\(/);
  });
  guard("S5", "no .finite() or .safe() presented as checks", /\.(finite|safe)\(\)\s*\/\/\s*(not Infinity|within)/);

  test("S6 z.cuid() is deprecated in the typings", () => {
    expect(typings("v4/classic/schemas.d.ts")).toMatch(/@deprecated CUID v1[\s\S]{0,300}export declare function cuid\(/);
  });
  guard("S6", "no z.cuid() in code without a deprecation note", /z\.cuid\(\)/, "code", /deprecated/i);

  test("S7 z.uuid() accepts any RFC 9562 version", () => {
    expect(z.uuid().safeParse("c232ab00-9414-11ec-b3c8-9f6bdeced846").success).toBe(true); // v1
    expect(z.uuidv4().safeParse("c232ab00-9414-11ec-b3c8-9f6bdeced846").success).toBe(false);
  });
  guard("S7", "no claim that z.uuid() is v4 only", /z\.uuid\(\)\s*\/\/\s*UUID \(v4\)/);

  test("S8 z.iso.datetime() is a string format, not a codec", () => {
    expect(z.iso.datetime().parse("2024-01-01T00:00:00Z")).toBe("2024-01-01T00:00:00Z");
  });
  guard("S8", "no built-in codecs", /Built-in Codecs|ISO datetime codec/);

  guard("S9", "no ^4.0.0 prerequisite", /Prerequisites[\s\S]{0,200}\^4\.0\.0/);

  test("S10 the brand type is z.$brand", () => {
    expect(typings("v4/core/core.d.ts")).toMatch(/\$brand/);
  });
  guard("S10", "no __brand", /__brand/);

  test("S11 required_error is ignored at runtime", () => {
    const s = (z.string as unknown as (p: unknown) => z.ZodString)({ required_error: "REQ" });
    expect(s.safeParse(undefined).error?.issues[0]?.message).not.toBe("REQ");
  });
  guard("S11", "no claim that required_error only fails silently", /required_error[^\n]*silently (ignored|does nothing)|Using them silently does nothing/i);

  test("S12 z.preprocess() is top-level and not deprecated", () => {
    expect(typeof z.preprocess).toBe("function");
    expect(typings("v4/classic/schemas.d.ts")).not.toMatch(/@deprecated[^\n]*\n\s*export declare function preprocess/);
  });
  guard("S12", "no claim that preprocess is legacy", /Legacy — prefer `\.pipe\(\)`/);

  test("S13 z.properties() is available in Zod and Zod Mini", () => {
    expect(typeof z.properties).toBe("function");
    expect(typeof zm.properties).toBe("function");
  });
  guard("S13", "no claim that only Zod Mini has z.properties()", /Zod Mini has `z\.properties\(\)` as a check/);

  guard("S14", "no claim that zod-testing is archived", /which is now\s+archived|zod-testing[^\n]*now archived/);
  guard("S15", "no claim that .apply(), .overwrite() or .register() are undocumented", /have no presence in the documentation/);
  guard("S16", "no 5.9x figure", /5\.9x/);
  guard("S17", "no zod/v4/mini import path", /zod\/v4\/mini/);
});

describe("R: findings after the audit", () => {
  test("R1 an object refinement runs after a failed check but not after a type error", () => {
    const F = z
      .object({ password: z.string().min(8), confirm: z.string(), nick: z.string() })
      .refine((d) => d.password === d.confirm, { error: "mismatch", path: ["confirm"] });
    const afterCheck = F.safeParse({ password: "short", confirm: "x", nick: "n" }).error?.issues.map((i) => i.code);
    expect(afterCheck).toEqual(["too_small", "custom"]);
    const afterType = F.safeParse({ password: "longenough", confirm: "x", nick: 1 }).error?.issues.map((i) => i.code);
    expect(afterType).toEqual(["invalid_type"]);
  });

  test("R2 a throw in .refine() or .transform() escapes safeParse()", () => {
    const r = z.number().refine(() => {
      throw new Error("boom");
    });
    expect(() => r.safeParse(1)).toThrow("boom");
    const t = z.string().transform(() => {
      throw new Error("boom");
    });
    expect(() => t.safeParse("x")).toThrow("boom");
  });

  test("R3 sync parse of an async refinement throws", () => {
    const s = z.string().refine(async () => true);
    expect(() => s.safeParse("x")).toThrow(/Encountered Promise during synchronous parse/);
    expect(() => s.validate("x")).toThrow();
  });

  test("R4 flattenError files nested issues under the top-level key", () => {
    const S = z.object({ address: z.object({ zip: z.string().length(5) }) });
    const err = S.safeParse({ address: { zip: "1" } }).error;
    expect(err && Object.keys(z.flattenError(err).fieldErrors)).toEqual(["address"]);
  });

  test("R5 parseInt accepts a numeric prefix; the regex pipe does not", () => {
    expect(Number.parseInt("12abc", 10)).toBe(12);
    const S = z.string().regex(z.regexes.integer).transform(Number).pipe(z.int().min(0));
    expect(S.parse("42")).toBe(42);
    expect(S.safeParse("12abc").success).toBe(false);
  });
  guard("R5", "no parseInt-based numeric check presented as GOOD", /GOOD: validate then transform/);

  test("R6 z.coerce.number() accepts what Number() accepts", () => {
    expect(z.coerce.number().parse("0x50")).toBe(80);
    expect(z.coerce.number().parse("")).toBe(0);
  });

  test("R7 .extend() on a refined object throws only on an overwrite", () => {
    const R = z.object({ a: z.string() }).refine((v) => v.a !== "");
    expect(() => R.extend({ b: z.string() })).not.toThrow();
    expect(() => R.extend({ a: z.number() })).toThrow(/safeExtend/);
    expect(() => R.partial()).toThrow();
  });

  test("R8 z.function() errors are core $ZodError, not z.ZodError", () => {
    const f = z.function({ input: [z.string()], output: z.boolean() }).implement((s) => s.length > 0);
    let caught: unknown;
    try {
      (f as unknown as (n: number) => boolean)(1);
    } catch (e) {
      caught = e;
    }
    expect(caught instanceof z.core.$ZodError).toBe(true);
    expect(caught instanceof z.ZodError).toBe(false);
  });

  test("R9 z.stringbool() accepts y/n and enabled/disabled, case-insensitively", () => {
    const b = z.stringbool();
    expect(["y", "enabled", "TRUE", "Yes"].map((v) => b.parse(v))).toEqual([true, true, true, true]);
    expect(["n", "disabled"].map((v) => b.parse(v))).toEqual([false, false]);
  });

  test("R10 a discriminated union reports the discriminator path", () => {
    const D = z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), v: z.string() }),
      z.object({ type: z.literal("b"), n: z.number() }),
    ]);
    expect(D.safeParse({ type: "c" }).error?.issues[0]?.path).toEqual(["type"]);
    expect(D.safeParse({ type: "a", v: 1 }).error?.issues[0]?.path).toEqual(["v"]);
  });
  guard("R10", "no O(1) dispatch claim", /O\(1\)/);

  test("R11 .encode() through a transform throws $ZodEncodeError", () => {
    const T = z.string().transform((s) => new Date(s));
    expect(() => T.encode(new Date())).toThrow(/unidirectional transform/);
  });

  guard("R12", "no eslintrc config in code", /\.eslintrc/, "code");
  guard("R13", "no top-level bench import from vitest", /import \{[^}]*\bbench\b[^}]*\} from "vitest"/, "code");
  guard("R14", "no claim that a toThrow() test passes when nothing throws", /(still "?passes"?|no throw means no assertion)/);
});

describe("B: behaviour changes by release (references/behaviour-changes.md)", () => {
  test("B1 z.uuid() checks the variant bits; z.guid() does not", () => {
    const v = "00000000-0000-0000-c000-000000000000";
    expect([z.uuid().safeParse(v).success, z.guid().safeParse(v).success]).toEqual([false, true]);
  });
  test("B2 z.base64url() rejects padding", () => {
    expect([z.base64url().safeParse("SGVsbG8=").success, z.base64url().safeParse("SGVsbG8").success]).toEqual([false, true]);
  });
  test("B3 a missing key with a z.coerce schema fails", () => {
    const issue = z.object({ foo: z.coerce.boolean() }).safeParse({}).error?.issues[0];
    expect(issue).toMatchObject({ code: "invalid_type", expected: "nonoptional", path: ["foo"] });
  });
  test("B4 defaults apply inside optional fields", () => {
    expect(z.object({ a: z.string().default("tuna").optional() }).parse({})).toEqual({ a: "tuna" });
  });
  test("B5 an enum-keyed record requires every key; partialRecord does not", () => {
    expect(z.record(z.enum(["a", "b"]), z.number()).safeParse({ a: 1 }).success).toBe(false);
    expect(z.partialRecord(z.enum(["a", "b"]), z.number()).safeParse({ a: 1 }).success).toBe(true);
  });
  test("B6 an unmergeable intersection throws a plain Error", () => {
    let caught: unknown;
    try {
      z.intersection(z.string().transform((s) => `${s}1`), z.string()).parse("a");
    } catch (e) {
      caught = e;
    }
    expect(caught instanceof Error && !(caught instanceof z.ZodError)).toBe(true);
    expect((caught as Error).message).toMatch(/^Unmergable intersection/);
  });
  test("B7 z.unknown(), z.any() and z.undefined() keys are required", () => {
    for (const s of [z.unknown(), z.any(), z.undefined()]) {
      expect(z.object({ a: s }).safeParse({}).success).toBe(false);
      expect(z.object({ a: s }).safeParse({ a: undefined }).success).toBe(true);
    }
  });
  test("B8 tuple defaults appear in the output", () => {
    expect(z.tuple([z.string(), z.string().default("fallback")]).parse(["a"])).toEqual(["a", "fallback"]);
    expect(z.tuple([z.string(), z.string().optional()]).parse(["a"])).toEqual(["a"]);
  });
  test("B9 .merge() throws when the receiver has refinements", () => {
    const refined = z.object({ a: z.string() }).refine((v) => v.a.length > 0);
    expect(() => refined.merge(z.object({ b: z.string() }))).toThrow(/Use \.safeExtend\(\) instead/); // deprecated: proves the 4.4 throw
  });
  test("B10 z.base64() rejects whitespace", () => {
    expect([z.base64().safeParse("Zm9v").success, z.base64().safeParse("Zm 9v").success]).toEqual([true, false]);
  });
  test("B11 z.httpUrl() rejects a protocol with one slash", () => {
    expect([z.httpUrl().safeParse("https://example.com").success, z.httpUrl().safeParse("https:/example.com").success]).toEqual([true, false]);
  });
  test("B12 a discriminated union error names the expected values", () => {
    const D = z.discriminatedUnion("type", [z.object({ type: z.literal("circle") }), z.object({ type: z.literal("square") })]);
    const issue = D.safeParse({ type: "tri" }).error?.issues[0];
    expect(issue?.message).toBe("Invalid discriminator value. Expected 'circle' | 'square'");
    expect(issue).toMatchObject({ options: ["circle", "square"], path: ["type"] });
  });
  test("B13 treeifyError keeps the paths of issues inside a union", () => {
    const U = z.object({ v: z.union([z.object({ k: z.string() }), z.object({ k: z.number(), j: z.string() })]) });
    const err = U.safeParse({ v: { k: true } }).error;
    const tree = err && z.treeifyError(err);
    expect(Object.keys(tree?.properties?.v?.properties ?? {}).sort()).toEqual(["j", "k"]);
  });
  test("B14 $defs entries carry no id", () => {
    const reg = z.registry<{ id: string }>();
    const Inner = z.object({ a: z.string() }).register(reg, { id: "Inner" });
    const out = z.toJSONSchema(z.object({ x: Inner, y: Inner }), { metadata: reg }) as { $defs?: Record<string, object> };
    expect(out.$defs?.Inner).toBeDefined();
    expect(out.$defs?.Inner).not.toHaveProperty("id");
  });
  test("B15 z.iso.datetime() requires seconds; local: true and precision: -1 accept minutes", () => {
    expect(z.iso.datetime().safeParse("2020-01-01T06:15Z").success).toBe(false);
    expect(z.iso.datetime({ local: true }).safeParse("2020-01-01T06:15").success).toBe(true);
    expect(z.union([z.iso.datetime(), z.iso.datetime({ precision: -1 })]).safeParse("2020-01-01T06:15Z").success).toBe(true);
  });
  test("B16 string length counts code points", () => {
    expect(z.string().max(5).safeParse("😀😀😀😀😀").success).toBe(true);
    expect(z.string().min(5).safeParse("😀😀😀").success).toBe(false);
  });
  test("B17 a record key schema applies only to matching keys", () => {
    const S = z.object({ name: z.string() }).and(z.record(z.string().regex(/^S_/), z.string()));
    expect(S.parse({ name: "a", S_a: "s" })).toEqual({ name: "a", S_a: "s" });
  });
  test("B18 unrecognized_keys does not stop the other checks", () => {
    const codes = z.strictObject({ a: z.string() }).safeParse({ a: 1, x: 2 }).error?.issues.map((i) => i.code);
    expect(codes).toEqual(["invalid_type", "unrecognized_keys"]);
  });
  test("B19 __proto__ is stripped; a strict object reports it", () => {
    const out = z.object({ a: z.string() }).parse(JSON.parse('{"a":"x","__proto__":{"polluted":1}}'));
    expect(Object.keys(out)).toEqual(["a"]);
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect((out as Record<string, unknown>).polluted).toBeUndefined();
    const codes = z.strictObject({ a: z.string() }).safeParse(JSON.parse('{"a":"x","__proto__":{}}')).error?.issues.map((i) => i.code);
    expect(codes).toEqual(["unrecognized_keys"]);
  });
  test("B20 z.ipv6() and z.ulid() are stricter", () => {
    expect([z.ipv6().safeParse("::1").success, z.ipv6().safeParse("::1\n").success]).toEqual([true, false]);
    expect([z.ulid().safeParse("01ARZ3NDEKTSV4RRFFQ69G5FAV").success, z.ulid().safeParse("81ARZ3NDEKTSV4RRFFQ69G5FAV").success]).toEqual([true, false]);
  });
  test("B21 error maps run on the first read of result.error; parse() is unchanged", () => {
    try {
      const result = z.string().safeParse(12);
      z.config(z.locales.fr());
      expect(result.error?.issues[0]?.message).toMatch(/^Entrée invalide/);
      z.config(z.locales.en());
      let thrown: unknown;
      try {
        z.string().parse(12);
      } catch (e) {
        thrown = e;
      }
      z.config(z.locales.fr());
      expect((thrown as z.ZodError).issues[0]?.message).toBe("Invalid input: expected string, received number");
    } finally {
      z.config(z.locales.en());
    }
  });
  test("B22 z.emoji() needs a pictograph", () => {
    expect([z.emoji().safeParse("😀").success, z.emoji().safeParse("123").success]).toEqual([true, false]);
  });
  test("B23 numeric enum .options lists only the values", () => {
    enum Country { UK, Germany, France }
    expect(z.enum(Country).options).toEqual([0, 1, 2]);
  });
  test("B24 toJSONSchema combines chained checks", () => {
    expect(z.toJSONSchema(z.number().min(0).max(23).int())).toMatchObject({ type: "integer", minimum: 0, maximum: 23 });
  });
  test("B25 bound getters read the combined checks", () => {
    expect(z.string().min(8).length(5).minLength).toBe(8);
  });
  test("B26 an email in a template literal does not check the text after it", () => {
    expect(z.templateLiteral([z.email(), "|", z.string()]).safeParse("a@b.cc|a..b").success).toBe(true);
  });
  test("B every row of behaviour-changes.md names a test that exists, or says Type-level or Not run", () => {
    const file = docs.find((d) => d.file === "references/behaviour-changes.md");
    expect(file).toBeDefined();
    const names = readFileSync(import.meta.path, "utf8");
    const rows = (file?.text ?? "").split("\n").filter((l) => /^\| (?!Change|---)/.test(l));
    expect(rows.length).toBeGreaterThan(30);
    const bad = rows
      .map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()).filter(Boolean).at(-1) ?? "")
      .filter((id) => !(id === "Type-level" || id === "Not run" || new RegExp(`test\\("${id} `).test(names)));
    expect(bad).toEqual([]);
  });
});

describe("C: compile (references/compile.md, rules/perf-compile.md)", () => {
  const Player = z.object({ username: z.string(), bio: z.string(), xp: z.number() });
  test("C1 z.compile() returns a new schema with the same results", () => {
    const C = z.compile(Player);
    expect(C).not.toBe(Player);
    expect(C.parse({ username: "a", bio: "b", xp: 1, extra: 2 })).toEqual(Player.parse({ username: "a", bio: "b", xp: 1, extra: 2 }));
    const bad = { username: 1, bio: 2, xp: "x" };
    expect(C.safeParse(bad).error?.issues).toEqual(Player.safeParse(bad).error?.issues);
    expect([C.validate({ username: "a", bio: "b", xp: 1 }), C.validate(bad)]).toEqual([true, false]);
  });
  test("C2 an async check or a .catch() function returns the original schema; strict throws", () => {
    const A = z.string().refine(async () => true);
    expect(z.compile(A)).toBe(A);
    expect(() => z.compile(A, { strict: true })).toThrow(z.ZodCompileAsyncError);
    const Q = z.object({ page: z.int().catch(() => 1) });
    expect(z.compile(Q)).toBe(Q);
    expect(() => z.compile(Q, { strict: true })).toThrow(z.ZodCompileUnsupportedError);
    expect(() => z.compile(z.xor([z.string(), z.number()]), { strict: true })).toThrow(z.ZodCompileUnsupportedError);
  });
  test("C3 a z.coerce child inside an object compiles around itself", () => {
    const Q = z.object({ page: z.coerce.number() });
    expect(z.compile(Q)).not.toBe(Q);
    expect(() => z.compile(Q, { strict: true })).not.toThrow();
    const bare = z.coerce.number();
    expect(z.compile(bare)).toBe(bare);
  });
  test("C4 the perf-compile Correct schemas compile under strict", () => {
    const OrderShape = z.object({ id: z.string(), qty: z.int() }).refine((o) => o.qty > 0);
    const QueryShape = z.object({ page: z.int().catch(1) });
    expect(() => z.compile(OrderShape, { strict: true })).not.toThrow();
    expect(() => z.compile(QueryShape, { strict: true })).not.toThrow();
    expect(() => z.compile(Player, { strict: true })).not.toThrow();
  });
  test("C5 z.withParser() installs a parser; z.INVALID hands the input to the runtime", () => {
    const Fast = z.withParser(Player, (input) => {
      const v = input as { username?: unknown; bio?: unknown; xp?: unknown } | null;
      return typeof v?.username === "string" && typeof v.bio === "string" && typeof v.xp === "number"
        ? { username: v.username, bio: v.bio, xp: v.xp }
        : z.INVALID;
    });
    expect(Fast.parse({ username: "a", bio: "b", xp: 1, x: 3 })).toEqual({ username: "a", bio: "b", xp: 1 });
    expect(Fast.safeParse({ username: 1 }).error?.issues[0]?.code).toBe("invalid_type");
  });
  test("C7 on 4.6.7 a union with a z.coerce member inside an object still compiles", () => {
    const U = z.object({ id: z.union([z.string(), z.coerce.number()]) });
    expect(z.compile(U)).not.toBe(U);
    expect(() => z.compile(U, { strict: true })).not.toThrow();
  });
  test("C6 zod/compile resolves", () => {
    expect(Bun.resolveSync("zod/compile", import.meta.dir)).toMatch(/zod\/compile\.js$/);
  });
});

describe("K: codecs (references/codecs.md)", () => {
  const isoDatetimeToDate = z.codec(z.iso.datetime(), z.date(), {
    decode: (s) => new Date(s),
    encode: (d) => d.toISOString(),
  });
  test("K1 defaults and .catch() apply only when decoding", () => {
    expect(z.string().default("hello").decode(undefined)).toBe("hello");
    expect(z.string().default("hello").safeEncode(undefined as never).success).toBe(false);
    expect(z.string().catch("hello").decode(1234 as never)).toBe("hello");
    expect(z.string().catch("hello").safeEncode(1234 as never).success).toBe(false);
  });
  test("K2 refinements run when encoding; stringbool encodes to the first value", () => {
    const after2000 = isoDatetimeToDate.refine((d) => d.getFullYear() >= 2000, "Must be this millennium");
    expect(after2000.safeEncode(new Date("1999-01-01")).error?.issues[0]?.message).toBe("Must be this millennium");
    expect(z.string().trim().encode("  hello  ")).toBe("hello");
    expect([z.stringbool().encode(true), z.stringbool({ truthy: ["yes", "y"], falsy: ["no", "n"] }).encode(false)]).toEqual(["true", "no"]);
  });
  test("K3 invertCodec swaps the directions", () => {
    const inverted = z.invertCodec(isoDatetimeToDate);
    expect(inverted.decode(new Date("2024-01-15T10:30:00.000Z"))).toBe("2024-01-15T10:30:00.000Z");
    expect(inverted.encode("2024-01-15T10:30:00.000Z")).toBeInstanceOf(Date);
  });
  test("K4 z.input() and z.output() project one side", () => {
    const Event = z.object({ name: z.string(), at: isoDatetimeToDate });
    expect(z.input(Event).safeParse({ name: "l", at: "2024-01-01T00:00:00Z" }).success).toBe(true);
    expect(z.output(Event).safeParse({ name: "l", at: new Date() }).success).toBe(true);
    expect(z.input(Event).safeParse({ name: "l", at: new Date() }).success).toBe(false);
  });
  test("K5 the top-level codec functions exist", () => {
    for (const f of ["decode", "encode", "safeDecode", "safeEncode", "decodeAsync", "encodeAsync", "safeDecodeAsync", "safeEncodeAsync"])
      expect(typeof (z as unknown as Record<string, unknown>)[f]).toBe("function");
  });

  // Runs the Recipes block of references/codecs.md as written, and checks it against the examples on zod.dev/codecs.
  const recipes = (() => {
    const file = "references/codecs.md";
    const text = docs.find((d) => d.file === file)?.text ?? "";
    const at = text.indexOf("\n## Recipes\n");
    const open = text.indexOf("```typescript\n", at);
    const close = text.indexOf("\n```", open + 14);
    if (at < 0 || open < 0 || close < 0) throw new Error(`${file}: no Recipes block`);
    const source = text.slice(open + 14, close);
    const line = text.slice(0, open).split("\n").length + 1;
    const names = [...source.matchAll(/^const (\w+) =/gm)].map((m) => m[1]);
    try {
      const js = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
      return new Function("z", `${js}\nreturn { ${names.join(", ")} };`)(z) as Record<string, z.ZodType & { decode(v: unknown): unknown; encode(v: unknown): unknown; safeDecode(v: unknown): { success: boolean } }> & {
        jsonCodec: (s: z.ZodType) => z.ZodType & { decode(v: unknown): unknown; encode(v: unknown): unknown; safeDecode(v: unknown): { success: boolean; error?: z.ZodError } };
      };
    } catch (e) {
      throw new Error(`${file}:${line}: the Recipes block does not run: ${(e as Error).message}`);
    }
  })();
  const bytes = (u: unknown) => [...(u as Uint8Array)];
  test("K6 the docs list 16 recipes; the block defines the 15 that the first example does not", () => {
    expect(Object.keys(recipes).length).toBe(15);
  });
  test("K7 number and integer recipes", () => {
    expect(recipes.stringToNumber.decode("42.5")).toBe(42.5);
    expect(recipes.stringToNumber.encode(42.5)).toBe("42.5");
    expect(recipes.stringToInt.decode("42")).toBe(42);
    expect(recipes.stringToInt.safeDecode("12abc").success).toBe(false);
    expect(recipes.stringToBigInt.decode("12345")).toBe(12345n);
    expect(recipes.numberToBigInt.decode(42)).toBe(42n);
    expect(recipes.numberToBigInt.encode(42n)).toBe(42);
  });
  test("K8 date recipes", () => {
    expect((recipes.epochSecondsToDate.decode(1705314600) as Date).toISOString()).toBe("2024-01-15T10:30:00.000Z");
    expect(recipes.epochSecondsToDate.encode(new Date("2024-01-15T10:30:00.000Z"))).toBe(1705314600);
    expect(recipes.epochMillisToDate.encode(new Date(1705314600000))).toBe(1705314600000);
    expect(isoDatetimeToDate.encode(new Date("2024-01-15"))).toBe("2024-01-15T00:00:00.000Z");
  });
  test("K9 jsonCodec decodes, rejects bad JSON as an issue, and encodes", () => {
    const J = recipes.jsonCodec(z.object({ name: z.string(), age: z.number() }));
    expect(J.decode('{"name":"Alice","age":30}')).toEqual({ name: "Alice", age: 30 });
    expect(J.encode({ name: "Bob", age: 25 })).toBe('{"name":"Bob","age":25}');
    const bad = J.safeDecode("~~invalid~~");
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]).toMatchObject({ code: "invalid_format", format: "json", path: [] });
  });
  test("K10 byte recipes", () => {
    expect(bytes(recipes.base64ToBytes.decode("SGVsbG8="))).toEqual([72, 101, 108, 108, 111]);
    expect(recipes.base64ToBytes.encode(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
    expect(bytes(recipes.base64urlToBytes.decode("SGVsbG8"))).toEqual([72, 101, 108, 108, 111]);
    expect(bytes(recipes.hexToBytes.decode("48656c6c6f"))).toEqual([72, 101, 108, 108, 111]);
    expect(recipes.hexToBytes.encode(new Uint8Array([72, 101, 108, 108, 111]))).toBe("48656c6c6f");
    expect(recipes.bytesToUtf8.decode(recipes.utf8ToBytes.decode("Hello, 世界!"))).toBe("Hello, 世界!");
    expect(bytes(recipes.bytesToUtf8.encode("Hi"))).toEqual([72, 105]);
  });
  test("K11 URL and URI recipes", () => {
    expect(recipes.stringToURL.encode(new URL("https://example.com"))).toBe("https://example.com/");
    expect(recipes.stringToURL.decode("https://example.com/path")).toBeInstanceOf(URL);
    expect(recipes.stringToHttpURL.safeDecode("mailto:a@b.co").success).toBe(false);
    expect(recipes.uriComponent.decode("Hello%20World%21")).toBe("Hello World!");
    expect(recipes.uriComponent.encode("Hello World!")).toBe("Hello%20World!");
  });
});

describe("M: metadata and JSON Schema (references/metadata-and-json-schema.md)", () => {
  test("M1 registry add, has, get, remove, clear; register returns the same schema", () => {
    const reg = z.registry<{ description: string }>();
    const s = z.string();
    reg.add(s, { description: "x" });
    expect([reg.has(s), reg.get(s)]).toEqual([true, { description: "x" }]);
    reg.remove(s);
    expect(reg.has(s)).toBe(false);
    const n = z.number();
    expect(n.register(reg, { description: "n" })).toBe(n);
    reg.clear();
    expect(reg.has(n)).toBe(false);
  });
  test("M2 on 4.6.7 .refine() and checks keep metadata; wrappers drop it", () => {
    const reg = z.registry<{ description: string }>();
    const A = z.string().register(reg, { description: "A" });
    expect(reg.get(A.refine(() => true))).toEqual({ description: "A" });
    expect(reg.get(A.min(1))).toEqual({ description: "A" });
    expect(reg.get(A.optional())).toBeUndefined();
    expect(reg.get(A.transform((s) => s))).toBeUndefined();
  });
  test("M3 on 4.6.7 a duplicate id is accepted by add() and throws in one toJSONSchema() conversion", () => {
    const reg = z.registry<{ id: string }>();
    const a = z.string();
    const b = z.number();
    expect(() => {
      reg.add(a, { id: "Dup" });
      reg.add(b, { id: "Dup" });
    }).not.toThrow();
    expect(() => z.toJSONSchema(z.object({ a, b }), { metadata: reg })).toThrow(/Duplicate schema id "Dup"/);
    expect(Object.keys((z.toJSONSchema(reg) as { schemas: object }).schemas)).toEqual(["Dup"]);
  });
  test("M4 toJSONSchema output shape and io", () => {
    expect(z.toJSONSchema(z.object({ name: z.string(), age: z.number() }))).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { name: { type: "string" }, age: { type: "number" } },
      required: ["name", "age"],
      additionalProperties: false,
    });
    expect(z.toJSONSchema(z.object({ name: z.string() }), { io: "input" })).not.toHaveProperty("additionalProperties");
    const Lengthy = z.string().transform((v) => v.length).pipe(z.number());
    expect(z.toJSONSchema(Lengthy)).toMatchObject({ type: "number" });
    expect(z.toJSONSchema(Lengthy, { io: "input" })).toMatchObject({ type: "string" });
  });
  test("M5 unrepresentable, cycles, reused, target, metadata", () => {
    expect(() => z.toJSONSchema(z.bigint())).toThrow(/BigInt cannot be represented/);
    expect(z.toJSONSchema(z.bigint(), { unrepresentable: "any" })).not.toHaveProperty("type");
    const dated = z.toJSONSchema(z.object({ at: z.date() }), {
      unrepresentable: ({ zodSchema }) => (zodSchema._zod.def.type === "date" ? { type: "string", format: "date-time" } : "throw"),
    }) as { properties: Record<string, unknown> };
    expect(dated.properties.at).toEqual({ type: "string", format: "date-time" });
    const User: z.ZodType = z.object({ name: z.string(), get friend() { return User; } });
    expect((z.toJSONSchema(User) as { properties: Record<string, unknown> }).properties.friend).toEqual({ $ref: "#" });
    expect(() => z.toJSONSchema(User, { cycles: "throw" })).toThrow(/Cycle detected/);
    const name = z.string();
    expect(z.toJSONSchema(z.object({ f: name, l: name }), { reused: "ref" })).toHaveProperty("$defs");
    expect(z.toJSONSchema(z.string(), { target: "draft-07" })).toMatchObject({ $schema: "http://json-schema.org/draft-07/schema#" });
    const reg = z.registry<{ title: string }>();
    expect(z.toJSONSchema(z.string().register(reg, { title: "T" }), { metadata: reg })).toMatchObject({ title: "T" });
    expect(z.toJSONSchema(z.string().register(reg, { title: "T" }), { metadata: z.registry() })).not.toHaveProperty("title");
  });
  test("M6 a registry converts to { schemas } keyed by id", () => {
    const reg = z.registry<{ id: string }>();
    reg.add(z.object({ title: z.string() }), { id: "Post" });
    expect(z.toJSONSchema(reg)).toEqual({
      schemas: {
        Post: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"],
          additionalProperties: false,
        },
      },
    });
  });
  test("M7 fromJSONSchema reads the 4.6 keywords", () => {
    expect(z.fromJSONSchema({ type: "object", minProperties: 2 }).safeParse({ a: 1 }).success).toBe(false);
    expect(z.fromJSONSchema({ type: "array", uniqueItems: true }).safeParse([{ a: 1 }, { a: 1 }]).success).toBe(false);
    expect(z.fromJSONSchema({ type: "array", contains: { type: "number" }, minContains: 2 }).safeParse(["a", 2]).success).toBe(false);
  });
});

describe("N: rules added in 1.3.0", () => {
  test("N1 parse-validate-boolean: validate() narrows to the input type", () => {
    const Port = z.string().regex(z.regexes.integer).transform(Number);
    const raw: unknown = "8080";
    expect(Port.validate(raw)).toBe(true);
    expect((raw as string) + 1).toBe("80801");
    const r = Port.safeParse(raw);
    expect(r.success && r.data + 1).toBe(8081);
  });
  test("N2 schema-json-string: z.json() returns text unparsed; JSON.parse in a transform escapes safeParse", () => {
    expect(z.json().parse('{"name":"Ada"}')).toBe('{"name":"Ada"}');
    const FromText = z.string().transform((s) => JSON.parse(s)).pipe(z.object({ name: z.string() }));
    expect(() => FromText.safeParse("{bad")).toThrow(SyntaxError);
  });
  test("N3 objects-and-composition: exactOptional, symbol keys, readonly freezes, properties keeps the instance", () => {
    const Profile = z.object({ nickname: z.string().exactOptional() });
    expect([Profile.safeParse({}).success, Profile.safeParse({ nickname: undefined }).success]).toEqual([true, false]);
    const TAG = Symbol("tag");
    const Tagged = z.object({ name: z.string(), [TAG]: z.number() });
    expect([Tagged.safeParse({ name: "a", [TAG]: 1 }).success, Tagged.safeParse({ name: "a" }).success]).toEqual([true, false]);
    expect(Object.isFrozen(z.object({ host: z.string() }).readonly().parse({ host: "h" }))).toBe(true);
    class Box { constructor(public size: number) {} }
    const box = new Box(3);
    expect(z.instanceof(Box).properties({ size: z.number().min(1) }).parse(box)).toBe(box);
  });
  test("N4 schema-types: stringFormat gives invalid_format", () => {
    expect(z.stringFormat("cool-id", /^cool-[a-z0-9]{8}$/).safeParse("x").error?.issues[0]?.code).toBe("invalid_format");
    expect(z.stringFormat("cool-id", /^cool-[a-z0-9]{8}$/).safeParse("cool-abcd1234").success).toBe(true);
  });
});

guard("D3", "no release-specific section in SKILL.md, AGENTS.md or the v3 files", /^## Zod [34]\.[0-9]/m, "all", undefined, "all");
// Example values in code, such as "2024-01-15T10:30:00.000Z", are data. A date in prose says when something was checked.
guard(
  "DATE",
  "no check dates or calendar dates in the skill prose",
  /\b20\d\d-\d\d-\d\d\b(?!T)|\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? (\d{1,2}(st|nd|rd|th)?\b|20\d\d\b)|\b\d{1,2}(st|nd|rd|th)? (January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
  "all",
  /^\s*(\/\/|z\.|[A-Za-z]+\.(de|en)code|[a-z]\w*\.(safe)?[Pp]arse|const |expect|\|.*`"20)|new Date\(|"20\d\d-\d\d-\d\d/,
  "all",
);

describe("V: Zod 3 (v3/references/zod-3.md, v3/rules/*.md), proved on the zod3 alias", () => {
  type Result = { success: boolean; error?: { issues: { code: string; path: PropertyKey[]; message: string }[] } };
  const issues = (r: Result) => (r.success ? [] : (r.error?.issues ?? []).map((i) => `${i.code}${i.path.length ? `@${i.path.join(".")}` : ""}: ${i.message}`));
  const rec = (x: unknown) => x as Record<string, unknown>;

  test("V1 both package lines expose zod/v3 and zod/v4", () => {
    expect(typeof z3v4.email).toBe("function");
    expect(typeof z3v4.flattenError).toBe("function");
    expect(typeof rec(z4v3).email).toBe("undefined");
    expect(z4v3.string().email().safeParse("a@b.co").success).toBe(true);
  });

  test("V2 Zod 3 has none of the top-level Zod 4 APIs the rules teach", () => {
    const absent = ["email", "uuid", "url", "ipv4", "stringbool", "json", "codec", "compile", "flattenError", "treeifyError", "prettifyError", "formatError", "toJSONSchema", "registry", "looseObject", "int", "iso", "partialRecord", "xor", "config"];
    expect(absent.filter((n) => n in z3)).toEqual([]);
    for (const n of ["strictObject", "NEVER", "ZodIssueCode", "nativeEnum", "lazy", "preprocess", "function", "coerce", "discriminatedUnion", "setErrorMap"]) expect(n in z3).toBe(true);
  });

  test("V3 Zod 3 schema, object and ZodError methods", () => {
    const s = rec(z3.string());
    expect(["validate", "validateAsync", "decode", "encode", "prefault", "check", "meta", "register", "overwrite", "safeExtend", "exactOptional"].filter((m) => typeof s[m] === "function")).toEqual([]);
    expect(["email", "url", "uuid", "ip", "cidr", "datetime", "base64url", "pipe", "brand"].every((m) => typeof s[m] === "function")).toBe(true);
    const o = rec(z3.object({}));
    expect(["strict", "passthrough", "strip", "merge", "deepPartial", "catchall"].every((m) => typeof o[m] === "function")).toBe(true);
    expect(["flatten", "format"].every((m) => typeof rec(z3.ZodError.prototype)[m] === "function")).toBe(true);
  });

  test("V4 Zod 3 error customization: required_error, invalid_type_error, message, errorMap; the Zod 4 `error` key is ignored", () => {
    expect(issues(z3.string({ required_error: "Name is required" }).safeParse(undefined))).toEqual(["invalid_type: Name is required"]);
    expect(issues(z3.string({ invalid_type_error: "Must be text" }).safeParse(1))).toEqual(["invalid_type: Must be text"]);
    expect(issues(z3.string().min(5, { message: "Too short" }).safeParse("ab"))).toEqual(["too_small: Too short"]);
    expect(issues(z3.string().min(5, "Too short!").safeParse("ab"))).toEqual(["too_small: Too short!"]);
    expect(issues(z3.string({ errorMap: () => ({ message: "Mapped" }) }).safeParse(1))).toEqual(["invalid_type: Mapped"]);
    expect(issues(z3.string().min(5, { error: "Too short" } as never).safeParse("ab"))).toEqual(["too_small: String must contain at least 5 character(s)"]);
  });

  test("V5 Zod 3 precedence: parse-level map, then schema-bound, then z.setErrorMap(); Zod 4 puts the schema first", () => {
    const three = z3.string({ errorMap: () => ({ message: "Schema" }) }).safeParse(1, { errorMap: () => ({ message: "Contextual" }) });
    expect(issues(three)).toEqual(["invalid_type: Contextual"]);
    z3.setErrorMap(() => ({ message: "Global" }));
    try {
      expect(z3.string({ errorMap: () => ({ message: "Schema" }) }).safeParse(1).error?.issues[0]?.message).toBe("Schema");
      expect(z3.string().safeParse(1).error?.issues[0]?.message).toBe("Global");
      expect(z3.string().safeParse(1, { errorMap: () => ({ message: "Contextual" }) }).error?.issues[0]?.message).toBe("Contextual");
    } finally {
      z3.setErrorMap(z3.defaultErrorMap);
    }
    expect(z3.string().safeParse(1).error?.issues[0]?.message).toBe("Expected string, received number");
    expect(z.string({ error: () => "Schema" }).safeParse(1, { error: () => "Contextual" }).error?.issues[0]?.message).toBe("Schema");
  });

  test("V6 Zod 3 ZodError: .errors is .issues; .flatten() and .format() are methods", () => {
    const err = z3.object({ email: z3.string().email(), n: z3.object({ a: z3.string() }) }).safeParse({ email: "x", n: { a: 1 } }).error;
    expect(err?.errors).toBe(err?.issues as never);
    expect(err?.flatten()).toEqual({ formErrors: [], fieldErrors: { email: ["Invalid email"], n: ["Expected string, received number"] } });
    expect(JSON.stringify(z3.object({ email: z3.string().email() }).safeParse({ email: "x" }).error?.format())).toBe('{"_errors":[],"email":{"_errors":["Invalid email"]}}');
    expect(err && "formErrors" in err).toBe(true);
  });

  test("V7 Zod 3 issue fields and codes", () => {
    const fmt = rec(z3.string().email().safeParse("x").error?.issues[0]);
    expect([fmt.code, fmt.validation, "input" in fmt]).toEqual(["invalid_string", "email", false]);
    const type = rec(z3.string().safeParse(1).error?.issues[0]);
    expect([type.code, type.expected, type.received]).toEqual(["invalid_type", "string", "number"]);
    expect("unionErrors" in rec(z3.union([z3.string(), z3.number()]).safeParse(true).error?.issues[0])).toBe(true);
    const du = z3.discriminatedUnion("type", [z3.object({ type: z3.literal("a") }), z3.object({ type: z3.literal("b") })]).safeParse({ type: "c" });
    expect(issues(du)).toEqual(["invalid_union_discriminator@type: Invalid discriminator value. Expected 'a' | 'b'"]);
    expect(Object.keys(z3.ZodIssueCode).sort()).toEqual([
      "custom", "invalid_arguments", "invalid_date", "invalid_enum_value", "invalid_intersection_types", "invalid_literal", "invalid_return_type",
      "invalid_string", "invalid_type", "invalid_union", "invalid_union_discriminator", "not_finite", "not_multiple_of", "too_big", "too_small", "unrecognized_keys",
    ]);
  });

  test("V8 the default messages differ between the versions", () => {
    expect(z3.string().safeParse(undefined).error?.issues[0]?.message).toBe("Required");
    expect(z.string().safeParse(undefined).error?.issues[0]?.message).toBe("Invalid input: expected string, received undefined");
    expect(z3.string().email().safeParse("x").error?.issues[0]?.message).toBe("Invalid email");
    expect(z.email().safeParse("x").error?.issues[0]?.message).toBe("Invalid email address");
    expect(z3.string().min(5).safeParse("ab").error?.issues[0]?.message).toBe("String must contain at least 5 character(s)");
    expect(z.string().min(5).safeParse("ab").error?.issues[0]?.message).toBe("Too small: expected string to have >=5 characters");
  });

  test("V9 Zod 3 parses the default value; Zod 4 short-circuits", () => {
    expect(issues(z3.string().min(5).default("ab").safeParse(undefined))).toEqual(["too_small: String must contain at least 5 character(s)"]);
    expect(z.string().min(5).default("ab").safeParse(undefined)).toEqual({ success: true, data: "ab" });
    expect(z3.string().transform((s) => s.length).default("tuna").parse(undefined)).toBe(4);
  });

  test("V10 z.coerce: a missing key coerces to false in Zod 3 and fails in Zod 4; Boolean(\"false\") is true in both", () => {
    expect(z3.object({ foo: z3.coerce.boolean() }).safeParse({})).toEqual({ success: true, data: { foo: false } });
    expect(z.object({ foo: z.coerce.boolean() }).safeParse({}).success).toBe(false);
    expect([z3.coerce.boolean().parse("false"), z.coerce.boolean().parse("false")]).toEqual([true, true]);
  });

  test("V11 Zod 3 objects: optional defaults, any/unknown keys, enum records, single-argument records, strict, passthrough, merge", () => {
    expect(z3.object({ a: z3.string().default("tuna").optional() }).parse({})).toEqual({});
    expect(z3.object({ a: z3.any(), b: z3.unknown() }).safeParse({}).success).toBe(true);
    expect(z3.record(z3.enum(["a", "b"]), z3.number()).safeParse({ a: 1 }).success).toBe(true);
    expect(z.record(z.enum(["a", "b"]), z.number()).safeParse({ a: 1 }).success).toBe(false);
    expect(z3.record(z3.number()).safeParse({ a: 1 }).success).toBe(true);
    expect(issues(z3.object({ a: z3.string() }).strict().safeParse({ a: "x", b: 1 }))).toEqual(["unrecognized_keys: Unrecognized key(s) in object: 'b'"]);
    expect(z3.object({ a: z3.string() }).passthrough().parse({ a: "x", b: 1 })).toEqual({ a: "x", b: 1 });
    expect(Object.keys(z3.object({ a: z3.string() }).merge(z3.object({ b: z3.number() })).shape)).toEqual(["a", "b"]);
    expect(z3.object({ a: z3.object({ b: z3.string() }) }).deepPartial().safeParse({ a: {} }).success).toBe(true);
  });

  test("V12 recursion in Zod 3: z.lazy() works, a getter works at runtime, cyclic input overflows the stack", () => {
    type Cat = { name: string; children: Cat[] };
    const Lazy: z3.ZodType<Cat> = z3.object({ name: z3.string(), children: z3.lazy(() => z3.array(Lazy)) });
    expect(Lazy.safeParse({ name: "a", children: [{ name: "b", children: [] }] }).success).toBe(true);
    const Getter: z3.ZodTypeAny = z3.object({ name: z3.string(), get children() { return z3.array(Getter); } });
    expect(Getter.safeParse({ name: "a", children: [{ name: "b", children: [] }] }).success).toBe(true);
    const Node: z3.ZodTypeAny = z3.object({ children: z3.lazy(() => z3.array(Node)) });
    const cyc: { children: unknown[] } = { children: [] };
    cyc.children.push(cyc);
    expect(() => Node.safeParse(cyc)).toThrow(RangeError);
    const Node4 = z.object({ get children() { return z.array(Node4); } });
    expect(Node4.safeParse(cyc).success).toBe(true);
  });

  test("V13 Zod 3 functions: .args().returns().implement() validates; the Zod 4 object form is not a function schema", () => {
    const f = z3.function().args(z3.string()).returns(z3.number()).implement((s) => s.length);
    expect(f("abc")).toBe(3);
    expect(() => (f as unknown as (n: number) => number)(42)).toThrow(z3.ZodError);
    const objectForm = (z3.function as unknown as (a: unknown) => { implement(fn: (...a: unknown[]) => unknown): (...a: unknown[]) => unknown })({ input: [z3.string()], output: z3.number() });
    let caught: unknown;
    try {
      objectForm.implement(() => 1)("abc");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught instanceof z3.ZodError).toBe(false);
  });

  test("V14 Zod 3 enums: z.nativeEnum() works, z.enum(TSEnum) builds and throws on parse, .Enum/.Values/.enum all exist", () => {
    enum Role { Admin = "admin", User = "user" }
    expect(z3.nativeEnum(Role).safeParse("admin").success).toBe(true);
    const wrong = (z3.enum as unknown as (e: unknown) => z3.ZodTypeAny)(Role);
    expect(() => wrong.safeParse("admin")).toThrow(TypeError);
    const S = z3.enum(["a", "b"]);
    expect([S.Enum.a, S.Values.a, S.enum.a]).toEqual(["a", "a", "a"]);
    expect(z.enum(Role).safeParse("admin").success).toBe(true);
  });

  test("V15 Zod 3 strings and numbers: datetime seconds, uuid variant, ip/cidr, Infinity, unsafe int, base64url padding, length units", () => {
    expect([z3.string().datetime().safeParse("2024-01-01T10:00Z").success, z.iso.datetime().safeParse("2024-01-01T10:00Z").success]).toEqual([true, false]);
    const badVariant = "c232ab00-9414-11ec-03c8-9f6bdeced846";
    expect([z3.string().uuid().safeParse(badVariant).success, z.uuid().safeParse(badVariant).success]).toEqual([true, false]);
    expect([z3.string().ip().safeParse("1.2.3.4").success, z3.string().cidr().safeParse("10.0.0.0/8").success]).toEqual([true, true]);
    expect([z3.number().safeParse(Infinity).success, z3.number().finite().safeParse(Infinity).success, z.number().safeParse(Infinity).success]).toEqual([true, false, false]);
    expect([z3.number().int().safeParse(2 ** 60).success, z.number().int().safeParse(2 ** 60).success]).toEqual([true, false]);
    expect([z3.string().base64url().safeParse("YQ==").success, z.base64url().safeParse("YQ==").success]).toEqual([true, false]);
    expect([z3.string().length(1).safeParse("😀").success, z.string().length(1).safeParse("😀").success]).toEqual([false, true]);
  });

  test("V16 Zod 3 refinements: a throw escapes safeParse, ctx.addIssue + z.NEVER reports, no ctx.issues, ctx.path exists, async needs parseAsync", () => {
    expect(() => z3.string().refine(() => { throw new Error("boom"); }).safeParse("x")).toThrow("boom");
    const T = z3.string().transform((v, ctx) => {
      ctx.addIssue({ code: z3.ZodIssueCode.custom, message: `Not a number: ${v}` });
      return z3.NEVER;
    });
    expect(issues(T.safeParse("x"))).toEqual(["custom: Not a number: x"]);
    let ctxIssues: unknown = "unset";
    z3.string().transform((_v, ctx) => { ctxIssues = rec(ctx).issues; return 1; }).safeParse("x");
    expect(ctxIssues).toBeUndefined();
    let p3: unknown;
    z3.object({ a: z3.string().superRefine((_v, ctx) => { p3 = ctx.path; }) }).safeParse({ a: "x" });
    expect(p3).toEqual(["a"]);
    let p4: unknown = "unset";
    z.object({ a: z.string().superRefine((_v, ctx) => { p4 = rec(ctx).path; }) }).safeParse({ a: "x" });
    expect(p4).toBeUndefined();
    expect(() => z3.string().refine(async () => true).safeParse("x")).toThrow(/parseAsync/);
    expect(issues(z3.string().refine((v) => v.length > 10, (v) => ({ message: `${v} is short` })).safeParse("ab"))).toEqual(["custom: ab is short"]);
    const Form = z3.object({ a: z3.string().min(5), b: z3.string() }).refine((d) => d.a === d.b, { message: "mismatch", path: ["b"] });
    expect(issues(Form.safeParse({ a: "ab", b: "x" }))).toEqual(["too_small@a: String must contain at least 5 character(s)", "custom@b: mismatch"]);
    expect(issues(Form.safeParse({ a: 1, b: "x" }))).toEqual(["invalid_type@a: Expected string, received number"]);
  });

  test("V17 Zod 3.25 implements Standard Schema; .pipe(), z.preprocess(), .brand() and z.setErrorMap() exist", () => {
    const s = rec(z3.string())["~standard"] as { vendor: string; version: number };
    expect([s.vendor, s.version]).toEqual(["zod", 1]);
    expect(z3.string().pipe(z3.coerce.number()).parse("42")).toBe(42);
    expect(z3.preprocess((v) => String(v), z3.string()).parse(12)).toBe("12");
    expect(z3.number().brand<"USD">().parse(5)).toBe(5);
    expect(typeof z3.setErrorMap).toBe("function");
  });

  test("V18 Zod 3 issue fields, ctx.defaultError, and the recipes in the Zod 3 rule files", () => {
    const lit = rec(z3.literal("a").safeParse("b").error?.issues[0]);
    expect([lit.code, lit.expected]).toEqual(["invalid_literal", "a"]);
    const en = rec(z3.enum(["a", "b"]).safeParse("c").error?.issues[0]);
    expect([en.code, en.options]).toEqual(["invalid_enum_value", ["a", "b"]]);
    const keys = rec(z3.object({ a: z3.string() }).strict().safeParse({ a: "x", b: 1 }).error?.issues[0]);
    expect([keys.code, keys.keys]).toEqual(["unrecognized_keys", ["b"]]);
    const small = rec(z3.string().min(5).safeParse("ab").error?.issues[0]);
    expect([small.code, small.minimum, small.inclusive, small.type]).toEqual(["too_small", 5, true, "string"]);
    const mult = rec(z3.number().multipleOf(5).safeParse(7).error?.issues[0]);
    expect([mult.code, mult.multipleOf]).toEqual(["not_multiple_of", 5]);
    const disc = rec(z3.discriminatedUnion("t", [z3.object({ t: z3.literal("a") }), z3.object({ t: z3.literal("b") })]).safeParse({ t: "c" }).error?.issues[0]);
    expect([disc.code, disc.options]).toEqual(["invalid_union_discriminator", ["a", "b"]]);
    const custom = rec(z3.string().superRefine((_v, ctx) => ctx.addIssue({ code: z3.ZodIssueCode.custom, message: "m", params: { k: 1 } })).safeParse("x").error?.issues[0]);
    expect([custom.code, custom.params]).toEqual(["custom", { k: 1 }]);
    const f = z3.function().args(z3.string()).returns(z3.number()).implement((s) => s.length);
    let fnErr: unknown;
    try {
      (f as unknown as (n: number) => number)(42);
    } catch (e) {
      fnErr = e;
    }
    const fnIssue = rec((fnErr as z3.ZodError).issues[0]);
    expect([fnIssue.code, fnIssue.argumentsError instanceof z3.ZodError]).toEqual(["invalid_arguments", true]);
    let seenDefault = "";
    z3.string({ errorMap: (_issue, ctx) => { seenDefault = ctx.defaultError; return { message: "m" }; } }).safeParse(1);
    expect(seenDefault).toBe("Expected string, received number");
    const StringBool = z3.enum(["true", "false", "1", "0", "yes", "no", "on", "off"]).transform((v) => v === "true" || v === "1" || v === "yes" || v === "on");
    const StringBoolCI = z3.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), StringBool);
    expect(z3.object({ debug: StringBool, verbose: StringBoolCI }).parse({ debug: "false", verbose: "OFF" })).toEqual({ debug: false, verbose: false });
    expect(StringBool.safeParse("maybe").error?.issues[0]?.code).toBe("invalid_enum_value");
    const Body = z3.object({ name: z3.string() });
    expect(() => z3.string().transform((s) => JSON.parse(s)).pipe(Body).safeParse("{bad")).toThrow(SyntaxError);
    const JsonText = z3.string().transform((text, ctx) => {
      try {
        return JSON.parse(text) as unknown;
      } catch (err) {
        ctx.addIssue({ code: z3.ZodIssueCode.custom, message: err instanceof Error ? err.message : "Invalid JSON" });
        return z3.NEVER;
      }
    });
    expect(JsonText.pipe(Body).parse('{"name":"Ada"}')).toEqual({ name: "Ada" });
    expect(issues(JsonText.pipe(Body).safeParse("{bad")).length).toBe(1);
    expect([z3.coerce.number().parse("0x50"), z3.coerce.number().parse(" 80 ")]).toEqual([80, 80]);
    expect(z3.string().regex(/^\d+$/).transform(Number).pipe(z3.number().int().min(1).max(65535)).safeParse("0x50").success).toBe(false);
    expect([z3.string().datetime({ offset: true }).safeParse("2024-01-01T10:00:00+02:00").success, z3.string().datetime().safeParse("2024-01-01T10:00:00+02:00").success]).toEqual([true, false]);
    const DateFromIso = z3.string().datetime().transform((s) => new Date(s));
    const IsoFromDate = z3.date().transform((d) => d.toISOString());
    expect(IsoFromDate.parse(DateFromIso.parse("2024-01-01T00:00:00Z"))).toBe("2024-01-01T00:00:00.000Z");
    const whole = z3.string().datetime({ precision: 0 });
    expect([whole.safeParse("2024-01-01T10:00:00Z").success, whole.safeParse("2024-01-01T10:00:00.123Z").success, whole.safeParse("2024-01-01T10:00Z").success]).toEqual([true, false, true]);
    const err = z3.string().safeParse(1).error!;
    expect(JSON.parse(err.message)).toEqual(JSON.parse(JSON.stringify(err.issues)));
    expect(err.toString()).toBe(err.message);
    const re = rec(z3.string().regex(/^\d+$/).safeParse("x").error?.issues[0]);
    expect([re.code, re.validation]).toEqual(["invalid_string", "regex"]);
    const g = z3.function().returns(z3.number()).implement((() => "x") as unknown as () => number);
    let retErr: unknown;
    try {
      g();
    } catch (e) {
      retErr = e;
    }
    const retIssue = rec((retErr as z3.ZodError).issues[0]);
    expect([retIssue.code, retIssue.returnTypeError instanceof z3.ZodError]).toEqual(["invalid_return_type", true]);
    expect(z3.date().safeParse(new Date("x")).error?.issues[0]?.code).toBe("invalid_date");
    const big = rec(z3.string().max(1).safeParse("abc").error?.issues[0]);
    expect([big.code, big.maximum, big.inclusive, big.exact, big.type]).toEqual(["too_big", 1, true, false, "string"]);
    const conflict = z3.intersection(z3.object({ a: z3.string() }).transform(() => ({ a: 1 })), z3.object({ a: z3.string().transform(() => "x") })).safeParse({ a: "s" });
    expect(conflict.error?.issues[0]?.code).toBe("invalid_intersection_types");
  });

  test("V19 Zod 3 discriminated unions: literal, enum, nativeEnum and null discriminators work; a string discriminator and a nested union throw at creation", () => {
    enum K { A = "a" }
    expect(z3.discriminatedUnion("t", [z3.object({ t: z3.enum(["a", "b"]), x: z3.number() }), z3.object({ t: z3.literal("c") })]).safeParse({ t: "b", x: 1 }).success).toBe(true);
    expect(z3.discriminatedUnion("t", [z3.object({ t: z3.nativeEnum(K) }), z3.object({ t: z3.literal("c") })]).safeParse({ t: "a" }).success).toBe(true);
    expect(z3.discriminatedUnion("t", [z3.object({ t: z3.null() }), z3.object({ t: z3.literal("c") })]).safeParse({ t: null }).success).toBe(true);
    expect(() => z3.discriminatedUnion("t", [z3.object({ t: z3.string() }), z3.object({ t: z3.literal("c") })])).toThrow(/could not be extracted/);
    const inner = z3.discriminatedUnion("t", [z3.object({ t: z3.literal("a") }), z3.object({ t: z3.literal("b") })]);
    expect(() => (z3.discriminatedUnion as unknown as (k: string, o: unknown[]) => unknown)("t", [inner, z3.object({ t: z3.literal("c") })])).toThrow(TypeError);
    const Nested4 = z.discriminatedUnion("t", [z.discriminatedUnion("t", [z.object({ t: z.literal("a") }), z.object({ t: z.literal("b") })]), z.object({ t: z.literal("c") })]);
    expect(Nested4.safeParse({ t: "a" }).success).toBe(true);
  });

  test("V every row of the zod-3.md behaviour table names a test that exists, or says Type-level", () => {
    const file = docs.find((d) => d.file === "v3/references/zod-3.md");
    expect(file).toBeDefined();
    const section = /## What parses differently\n([\s\S]*?)(?=\n## )/.exec(file?.text ?? "")?.[1] ?? "";
    const rows = section.split("\n").filter((l) => /^\| (?!Behaviour|---)/.test(l));
    expect(rows.length).toBeGreaterThan(12);
    const names = readFileSync(import.meta.path, "utf8");
    const bad = rows
      .map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()).filter(Boolean).at(-1) ?? "")
      .filter((id) => !(id === "Type-level" || new RegExp(`test\\("${id} `).test(names)));
    expect(bad).toEqual([]);
  });

  test("V the Zod 3 rule files cover the rules whose code differs, and each names its Zod 4 counterpart", () => {
    const v3Rules = docs.filter((d) => d.file.startsWith("v3/rules/"));
    for (const d of v3Rules) {
      const id = d.file.slice("v3/rules/".length, -3);
      expect(docs.some((x) => x.file === `rules/${id}.md`)).toBe(true);
      expect(d.text).toContain(`rules/${id}.md`);
    }
  });
});
