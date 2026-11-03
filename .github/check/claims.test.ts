// Behaviour claims the skill makes, each proved on the pinned zod, and text guards that fail when a
// corrected claim comes back. Test names carry the audit ids (F, P, S) and
// the ids of later findings (R).
//
// Usage: bun test claims.test.ts
//        SKILL_ROOT=<path to another checkout> bun test claims.test.ts   # run the text guards against it
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as z from "zod";
import * as zm from "zod/mini";

const ROOT = resolve(process.env.SKILL_ROOT ?? join(import.meta.dir, "../.."));
const ZOD = dirname(Bun.resolveSync("zod/package.json", import.meta.dir));
const typings = (rel: string) => readFileSync(join(ZOD, rel), "utf8");

type Doc = { file: string; text: string };
const docs: Doc[] = (() => {
  const files = ["SKILL.md", "AGENTS.md", "README.md"].filter((f) => existsSync(join(ROOT, f)));
  for (const dir of ["rules", "references"]) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of readdirSync(join(ROOT, dir)).sort()) if (f.endsWith(".md")) files.push(`${dir}/${f}`);
  }
  return files.map((file) => ({ file, text: readFileSync(join(ROOT, file), "utf8") }));
})();

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

// Every match of `pattern` in the skill text. `where` limits the scan to code lines.
function hits(pattern: RegExp, where: "all" | "code" = "all", skipLine?: RegExp): string[] {
  const found: string[] = [];
  for (const d of docs) {
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

const guard = (id: string, what: string, pattern: RegExp, where: "all" | "code" = "all", skipLine?: RegExp) =>
  test(`${id} text: ${what}`, () => expect(hits(pattern, where, skipLine)).toEqual([]));

test("the text guards scan the skill", () => {
  expect(docs.some((d) => d.file === "SKILL.md")).toBe(true);
  expect(docs.filter((d) => d.file.startsWith("rules/")).length).toBeGreaterThan(20);
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
