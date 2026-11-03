// Builds AGENTS.md from SKILL.md and rules/*.md, and checks that the skill's index files agree with each other.
//
// Usage: bun agents.ts            write AGENTS.md
//        bun agents.ts --check    fail when AGENTS.md is stale or an index disagrees with the files
//
// Single sources:
// - The Zod baseline is the `compatibility` line in SKILL.md. README.md must quote the same range, and the
//   version it was checked against must equal the zod version that package.json pins for the check.
// - The rule order is the Quick Reference in SKILL.md. Every rule file is listed there once, and every listed
//   id has a file. Every references/*.md file is listed in the SKILL.md References table.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GENERATED_MARKER } from "./blocks.ts";

const CHECK = import.meta.dir;
const ROOT = resolve(CHECK, "../..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
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
const range = /zod (\^[\d.]+)/.exec(compatibility)?.[1];
const checkedAgainst = /checked against zod ([\d.]+)/.exec(compatibility)?.[1];
const pinned = JSON.parse(readFileSync(join(CHECK, "package.json"), "utf8")).devDependencies?.zod;
if (!range || !checkedAgainst) problems.push(`SKILL.md: compatibility must read "... zod ^X.Y.Z ... (checked against zod A.B.C)", got "${compatibility}"`);
if (checkedAgainst && pinned !== checkedAgainst) problems.push(`SKILL.md checked against zod ${checkedAgainst}, but the check pins zod ${pinned}`);
if (range && !read("README.md").includes(`zod ${range}`)) problems.push(`README.md does not quote the baseline "zod ${range}"`);
if (range && !read("SKILL.md").includes(`Baseline: zod ${range}`)) problems.push(`SKILL.md description does not read "Baseline: zod ${range}"`);

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
const files = readdirSync(join(ROOT, "rules")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
for (const id of files) if (!listed.includes(id)) problems.push(`rules/${id}.md is not in the SKILL.md Quick Reference`);
for (const id of listed) if (!files.includes(id)) problems.push(`SKILL.md lists ${id}, but rules/${id}.md does not exist`);
for (const id of new Set(listed)) if (listed.filter((x) => x === id).length > 1) problems.push(`SKILL.md lists ${id} more than once`);

const references = readdirSync(join(ROOT, "references")).filter((f) => f.endsWith(".md")).sort();
for (const f of references) if (!skill.body.includes(`references/${f}`)) problems.push(`references/${f} is not in the SKILL.md References table`);
for (const m of skill.body.matchAll(/`references\/([\w-]+\.md)`/g))
  if (!existsSync(join(ROOT, "references", m[1]))) problems.push(`SKILL.md names references/${m[1]}, which does not exist`);

// Cross-references in the skill text must resolve: every `references/<file>.md`, every relative
// markdown link, and every backticked rule id that uses a category prefix.
const prefixes = categories.map((c) => c.prefix);
const ruleId = new RegExp(`\`((?:${prefixes.join("|") || "_"})-[a-z][\\w-]*)\``, "g");
const texts = ["SKILL.md", "README.md", ...files.map((id) => `rules/${id}.md`), ...references.map((f) => `references/${f}`)];
for (const src of texts) {
  const text = read(src);
  for (const m of text.matchAll(/references\/([\w-]+\.md)/g))
    if (!existsSync(join(ROOT, "references", m[1]))) problems.push(`${src} names references/${m[1]}, which does not exist`);
  for (const m of text.matchAll(ruleId))
    if (!files.includes(m[1])) problems.push(`${src} names rule ${m[1]}, which does not exist`);
  for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+\.md)(?:#[^)]*)?\)/g)) {
    const target = resolve(ROOT, src, "..", m[1]);
    if (!existsSync(target)) problems.push(`${src} links to ${m[1]}, which does not exist`);
  }
}

// Each reference names its source and the Zod version on line 3, and no check date.
for (const f of references) {
  const third = read(`references/${f}`).split("\n")[2] ?? "";
  if (!/^(Docs: .+ · Zod \d+\.\d+\.\d+$|Checked against Zod \d+\.\d+\.\d+)/.test(third))
    problems.push(`references/${f}: line 3 must read "Docs: <pages> · Zod <version>" or "Checked against Zod <version>..."`);
}

// README.md states the rule count and lists every reference by file name.
const readme = read("README.md");
if (!readme.includes(`${files.length} Rules Across ${categories.length} Categories`)) problems.push(`README.md does not read "${files.length} Rules Across ${categories.length} Categories"`);
if (!readme.includes(`${references.length} Deep-Dive References`)) problems.push(`README.md does not read "${references.length} Deep-Dive References"`);
for (const f of references) if (!readme.includes(`\`${f}\``)) problems.push(`README.md does not list references/${f}`);
for (const c of categories) {
  const count = files.filter((id) => id.startsWith(`${c.prefix}-`)).length;
  const row = new RegExp(`^\\|\\s*${c.priority}\\s*\\|[^|]*\\|\\s*(\\d+)\\s*\\|`, "m").exec(readme);
  if (!row || Number(row[1]) !== count) problems.push(`README.md category ${c.priority} should count ${count} rules, reads ${row?.[1] ?? "nothing"}`);
}

// GitHub heading anchors: lowercase, drop punctuation, and turn each space into a hyphen without collapsing runs.
const anchor = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/ /g, "-");
const sections: string[] = [];
const toc: string[] = [];
for (const c of categories.sort((a, b) => a.priority - b.priority)) {
  const ids = listed.filter((id) => id.startsWith(`${c.prefix}-`));
  const heading = `${c.priority}. ${c.name}`;
  toc.push(`${c.priority}. [${c.name}](#${anchor(heading)}) — ${c.impact}`);
  const parts = [`## ${heading}\n\n**Impact: ${c.impact}**`];
  for (const id of ids) {
    const file = `rules/${id}.md`;
    if (!existsSync(join(ROOT, file))) continue;
    const rule = frontmatter(read(file), file);
    for (const key of ["title", "impact", "description", "tags"]) if (!rule.fields[key]) problems.push(`${file}: frontmatter has no ${key}`);
    if (rule.fields.impact && !["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(rule.fields.impact)) problems.push(`${file}: impact "${rule.fields.impact}"`);
    const body = rule.body.replace(/^\s*# .*\n+/, "").trim();
    parts.push(`### ${rule.fields.title}\n\n\`${id}\` · **${rule.fields.impact}** · ${rule.fields.description}\n\n${demote(body, 2)}`);
  }
  sections.push(parts.join("\n\n"));
}

const abstract = /## When to Use Zod\n\n([\s\S]*?)\n\n/.exec(skill.body)?.[1] ?? "";
if (!abstract) problems.push('SKILL.md: no paragraph under "## When to Use Zod"');
const referenceRows = references.map((f) => `- \`references/${f}\``).join("\n");
const agents = `${GENERATED_MARKER}

# Zod: compiled rules

Every rule in \`rules/\`, expanded, for agents that read one file. Source: \`SKILL.md\` and \`rules/*.md\`.
Baseline: zod ${range}, checked against zod ${checkedAgainst}. Skill version ${skill.fields.version ?? "?"}.

## Abstract

${abstract}

## Table of Contents

${toc.join("\n")}

${sections.join("\n\n---\n\n")}

---

## References

The references are not expanded here. Read them from the skill folder:

${referenceRows}
`;

const current = existsSync(join(ROOT, "AGENTS.md")) ? read("AGENTS.md") : "";
if (process.argv.includes("--check")) {
  if (current !== agents) problems.push("AGENTS.md is stale: run `bun agents.ts` in .github/check");
} else if (problems.length === 0) {
  writeFileSync(join(ROOT, "AGENTS.md"), agents);
  console.log(`AGENTS.md written: ${listed.length} rules, ${categories.length} categories`);
}
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
