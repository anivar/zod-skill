// Builds AGENTS.md from SKILL.md and rules/*.md, builds v3/AGENTS.md from v3/rules/*.md, and checks that the
// skill's index files agree with each other.
//
// Usage: bun agents.ts            write AGENTS.md and v3/AGENTS.md
//        bun agents.ts --check    fail when either file is stale or an index disagrees with the files
//
// Single sources:
// - The Zod baselines are the `compatibility` line in SKILL.md: one "zod ^X (checked against zod 4.a.b)" pair
//   and one "zod ^Y (checked against zod 3.c.d)" pair. README.md quotes both ranges. The Zod 4 version equals
//   the `zod` pin in package.json; the Zod 3 version equals the `zod3` alias pin (npm:zod@3.c.d).
// - The rule order is the Quick Reference in SKILL.md. Every rule file is listed there once, and every listed
//   id has a file. Every references/*.md file is listed in the SKILL.md References table. Every v3/rules/<id>.md
//   has a rules/<id>.md counterpart, and every v3/references/*.md is named in SKILL.md.
// - The "Which Zod" section of SKILL.md is copied into both compiled files, so an agent that reads one file
//   alone still sees the version test.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GENERATED_MARKER, noV3Form } from "./blocks.ts";

const CHECK = import.meta.dir;
const ROOT = resolve(CHECK, "../..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const list = (d: string) => (existsSync(join(ROOT, d)) ? readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".md")).sort() : []);
const problems: string[] = [];

function frontmatter(text: string, file: string): { fields: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) {
    problems.push(`${file}: no frontmatter`);
    return { fields: {}, body: text };
  }
  const fields: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^\s*([\w-]+):\s*(.*)$/.exec(line);
    if (kv && kv[2] !== "" && kv[2] !== ">") fields[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
  }
  return { fields, body: text.slice(m[0].length) };
}

// Moves every heading down by `by` levels, outside code fences.
function demote(body: string, by: number): string {
  let fenced = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) fenced = !fenced;
      return !fenced && /^#{1,4} /.test(line) ? "#".repeat(by) + line : line;
    })
    .join("\n");
}

const skill = frontmatter(read("SKILL.md"), "SKILL.md");
const compatibility = skill.fields.compatibility ?? "";
const pairs = [...compatibility.matchAll(/zod (\^[\d.]+) \(checked against zod ([\d.]+)\)/g)].map((m) => ({ range: m[1], checked: m[2] }));
const v4 = pairs.find((p) => p.checked.startsWith("4."));
const v3 = pairs.find((p) => p.checked.startsWith("3."));
const pins: Record<string, string> = JSON.parse(readFileSync(join(CHECK, "package.json"), "utf8")).devDependencies ?? {};
if (!v4 || !v3)
  problems.push(`SKILL.md: compatibility must read "... zod ^X (checked against zod 4.a.b) ... zod ^Y (checked against zod 3.c.d)", got "${compatibility}"`);
if (v4 && pins.zod !== v4.checked) problems.push(`SKILL.md checked against zod ${v4.checked}, but the check pins zod ${pins.zod}`);
if (v3 && pins.zod3 !== `npm:zod@${v3.checked}`) problems.push(`SKILL.md checked against zod ${v3.checked}, but the check pins zod3 ${pins.zod3}`);
for (const p of pairs) if (!read("README.md").includes(`zod ${p.range}`)) problems.push(`README.md does not quote the baseline "zod ${p.range}"`);
if (v4 && !read("SKILL.md").includes(`Baseline: zod ${v4.range}`)) problems.push(`SKILL.md description does not read "Baseline: zod ${v4.range}"`);
if (v3 && !read("SKILL.md").includes(`Zod 3 projects: zod ${v3.range}`)) problems.push(`SKILL.md description does not read "Zod 3 projects: zod ${v3.range}"`);

// Categories: | Priority | Category | Impact | Prefix |
const categories = [...skill.body.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([A-Z/]+)\s*\|\s*`([a-z]+)-`\s*\|$/gm)].map((m) => ({
  priority: Number(m[1]),
  name: m[2],
  impact: m[3],
  prefix: m[4],
}));
if (categories.length === 0) problems.push("SKILL.md: no rule category table");

// Quick reference order: "- `rule-id` — summary"
const listed = [...skill.body.matchAll(/^- `([a-z]+-[\w-]+)` — /gm)].map((m) => m[1]);
const files = list("rules").map((f) => f.slice(0, -3));
for (const id of files) if (!listed.includes(id)) problems.push(`rules/${id}.md is not in the SKILL.md Quick Reference`);
for (const id of listed) if (!files.includes(id)) problems.push(`SKILL.md lists ${id}, but rules/${id}.md does not exist`);
for (const id of new Set(listed)) if (listed.filter((x) => x === id).length > 1) problems.push(`SKILL.md lists ${id} more than once`);

// Zod 3 files: a rule file per rule whose Zod 3 form differs, and the Zod 3 references.
const v3Files = list("v3/rules").map((f) => f.slice(0, -3));
for (const id of v3Files) if (!files.includes(id)) problems.push(`v3/rules/${id}.md has no rules/${id}.md counterpart`);
const v3References = list("v3/references");
for (const f of v3References) if (!skill.body.includes(`v3/references/${f}`)) problems.push(`v3/references/${f} is not named in SKILL.md`);
// The "No Zod 3 form" list names existing rules that have no Zod 3 file.
for (const id of noV3Form(ROOT)) {
  if (!files.includes(id)) problems.push(`v3/references/zod-3.md lists ${id} under "No Zod 3 form", but rules/${id}.md does not exist`);
  if (v3Files.includes(id)) problems.push(`v3/references/zod-3.md lists ${id} under "No Zod 3 form", but v3/rules/${id}.md exists`);
}

const references = list("references");
for (const f of references) if (!skill.body.includes(`references/${f}`)) problems.push(`references/${f} is not in the SKILL.md References table`);

// Cross-references in the skill text must resolve: every `references/<file>.md` and `v3/references/<file>.md`,
// every relative markdown link, and every backticked rule id that uses a category prefix.
const prefixes = categories.map((c) => c.prefix);
const ruleId = new RegExp(`\`((?:${prefixes.join("|") || "_"})-[a-z][\\w-]*)\``, "g");
const texts = [
  "SKILL.md",
  "README.md",
  ...files.map((id) => `rules/${id}.md`),
  ...references.map((f) => `references/${f}`),
  ...v3Files.map((id) => `v3/rules/${id}.md`),
  ...v3References.map((f) => `v3/references/${f}`),
];
for (const src of texts) {
  const text = read(src);
  for (const m of text.matchAll(/(v3\/)?references\/([\w-]+\.md)/g))
    if (!existsSync(join(ROOT, m[1] ?? "", "references", m[2]))) problems.push(`${src} names ${m[0]}, which does not exist`);
  for (const m of text.matchAll(ruleId)) if (!files.includes(m[1])) problems.push(`${src} names rule ${m[1]}, which does not exist`);
  for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+\.md)(?:#[^)]*)?\)/g)) {
    const target = resolve(ROOT, src, "..", m[1]);
    if (!existsSync(target)) problems.push(`${src} links to ${m[1]}, which does not exist`);
  }
}

// Each reference names its source and the Zod version it was checked against on line 3, and no check date.
// A Zod 4 reference names the Zod 4 version; a Zod 3 reference names the Zod 3 version.
for (const [dir, version] of [
  ["references", v4?.checked],
  ["v3/references", v3?.checked],
] as const) {
  for (const f of list(dir)) {
    const third = read(`${dir}/${f}`).split("\n")[2] ?? "";
    const m = /^(?:Docs: .+ · Zod (\d+\.\d+\.\d+)$|Checked against Zod (\d+\.\d+\.\d+))/.exec(third);
    if (!m) problems.push(`${dir}/${f}: line 3 must read "Docs: <pages> · Zod <version>" or "Checked against Zod <version>..."`);
    else if (version && (m[1] ?? m[2]) !== version) problems.push(`${dir}/${f}: line 3 names Zod ${m[1] ?? m[2]}, the baseline is ${version}`);
  }
}

// Every Zod 3 rule file carries the same frontmatter fields and a title that says Zod 3.
for (const id of v3Files) {
  const rule = frontmatter(read(`v3/rules/${id}.md`), `v3/rules/${id}.md`);
  if (rule.fields.title && !/Zod 3/.test(rule.fields.title)) problems.push(`v3/rules/${id}.md: title must say Zod 3`);
}

// README.md states the counts and lists every reference by file name.
const readme = read("README.md");
if (!readme.includes(`${files.length} Rules Across ${categories.length} Categories`)) problems.push(`README.md does not read "${files.length} Rules Across ${categories.length} Categories"`);
if (!readme.includes(`${references.length} Deep-Dive References`)) problems.push(`README.md does not read "${references.length} Deep-Dive References"`);
if (!readme.includes(`${v3Files.length} Zod 3 rule files`)) problems.push(`README.md does not read "${v3Files.length} Zod 3 rule files"`);
for (const f of references) if (!readme.includes(`\`${f}\``)) problems.push(`README.md does not list ${f}`);
for (const f of v3References) if (!readme.includes(`\`v3/references/${f}\``)) problems.push(`README.md does not list v3/references/${f}`);
for (const c of categories) {
  const count = files.filter((id) => id.startsWith(`${c.prefix}-`)).length;
  const row = new RegExp(`^\\|\\s*${c.priority}\\s*\\|[^|]*\\|\\s*(\\d+)\\s*\\|`, "m").exec(readme);
  if (!row || Number(row[1]) !== count) problems.push(`README.md category ${c.priority} should count ${count} rules, reads ${row?.[1] ?? "nothing"}`);
}

const abstract = /## When to Use Zod\n\n([\s\S]*?)\n\n/.exec(skill.body)?.[1] ?? "";
if (!abstract) problems.push('SKILL.md: no paragraph under "## When to Use Zod"');
const whichZod = /## Which Zod\n\n([\s\S]*?)(?=\n## )/.exec(skill.body)?.[1]?.trim() ?? "";
if (!whichZod) problems.push('SKILL.md: no "## Which Zod" section');

// GitHub heading anchors: lowercase, drop punctuation, and turn each space into a hyphen without collapsing runs.
const anchor = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/ /g, "-");

type Compiled = { toc: string[]; sections: string[] };
function compile(dir: string, ids: string[]): Compiled {
  const toc: string[] = [];
  const sections: string[] = [];
  for (const c of [...categories].sort((a, b) => a.priority - b.priority)) {
    const inCategory = ids.filter((id) => id.startsWith(`${c.prefix}-`));
    if (inCategory.length === 0) continue;
    const heading = `${c.priority}. ${c.name}`;
    toc.push(`${c.priority}. [${c.name}](#${anchor(heading)}) — ${c.impact}`);
    const parts = [`## ${heading}\n\n**Impact: ${c.impact}**`];
    for (const id of inCategory) {
      const file = `${dir}/${id}.md`;
      if (!existsSync(join(ROOT, file))) continue;
      const rule = frontmatter(read(file), file);
      for (const key of ["title", "impact", "description", "tags"]) if (!rule.fields[key]) problems.push(`${file}: frontmatter has no ${key}`);
      if (rule.fields.impact && !["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(rule.fields.impact)) problems.push(`${file}: impact "${rule.fields.impact}"`);
      const body = rule.body.replace(/^\s*# .*\n+/, "").trim();
      parts.push(`### ${rule.fields.title}\n\n\`${id}\` · **${rule.fields.impact}** · ${rule.fields.description}\n\n${demote(body, 2)}`);
    }
    sections.push(parts.join("\n\n"));
  }
  return { toc, sections };
}

const main = compile("rules", listed);
const agents = `${GENERATED_MARKER}

# Zod: compiled rules

Every rule in \`rules/\`, expanded, for agents that read one file. Source: \`SKILL.md\` and \`rules/*.md\`.
Baseline: zod ${v4?.range}, checked against zod ${v4?.checked}. Skill version ${skill.fields.version ?? "?"}.
Zod 3 projects: zod ${v3?.range}, checked against zod ${v3?.checked}; the Zod 3 forms are in \`v3/AGENTS.md\`.

## Abstract

${abstract}

## Which Zod

${whichZod}

## Table of Contents

${main.toc.join("\n")}

${main.sections.join("\n\n---\n\n")}

---

## References

The references are not expanded here. Read them from the skill folder:

${references.map((f) => `- \`references/${f}\``).join("\n")}
`;

const three = compile("v3/rules", listed.filter((id) => v3Files.includes(id)));
const agentsV3 = `${GENERATED_MARKER}

# Zod 3: compiled rules

The Zod 3 form of every rule in \`v3/rules/\`, expanded, for agents that read one file. A rule with no file here
applies as written in \`AGENTS.md\`; the check compiles those rules against Zod 3 to keep that true. The rules
with no Zod 3 form at all are listed in \`v3/references/zod-3.md\`. Source: \`SKILL.md\` and \`v3/rules/*.md\`.
Baseline: zod ${v3?.range}, checked against zod ${v3?.checked}. Skill version ${skill.fields.version ?? "?"}.

## Abstract

${abstract}

## Which Zod

${whichZod}

## Table of Contents

${three.toc.join("\n")}

${three.sections.join("\n\n---\n\n")}

---

## References

The references are not expanded here. Read them from the skill folder. The Zod 4 references in \`references/\`
describe Zod 4 code: read them for the concepts, and \`v3/references/zod-3.md\` for the Zod 3 spelling.

${v3References.map((f) => `- \`v3/references/${f}\``).join("\n")}
`;

const outputs: Record<string, string> = { "AGENTS.md": agents, "v3/AGENTS.md": agentsV3 };
const stale = Object.entries(outputs).filter(([f, text]) => !existsSync(join(ROOT, f)) || read(f) !== text).map(([f]) => f);
if (process.argv.includes("--check")) {
  for (const f of stale) problems.push(`${f} is stale: run \`bun agents.ts\` in .github/check`);
} else if (problems.length === 0) {
  for (const f of stale) writeFileSync(join(ROOT, f), outputs[f]);
  console.log(`AGENTS.md: ${listed.length} rules, ${categories.length} categories; v3/AGENTS.md: ${v3Files.length} rules${stale.length ? ` (wrote ${stale.join(", ")})` : " (current)"}`);
}
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
