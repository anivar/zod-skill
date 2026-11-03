// Generates the zod-testing skill's guide from this skill's testing references, or checks that it is current.
//
// Usage: bun sync-testing.ts            write the zod-testing copy
//        bun sync-testing.ts --check    fail when the zod-testing copy differs
//
// ZOD_TESTING_ROOT names the zod-testing checkout; the default is a sibling of this repository.
// Mapping (zod-skill → zod-testing):
//   references/testing.md               → SKILL.md body (zod-testing keeps its own frontmatter)
//   references/testing-api.md           → references/api-reference.md
//   references/testing-anti-patterns.md → references/anti-patterns.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TARGET = resolve(process.env.ZOD_TESTING_ROOT ?? join(ROOT, "../zod-testing"));
const MARKER = "<!-- Generated from anivar/zod-skill by .github/check/sync-testing.ts. Edit the zod-skill copy. -->";
const read = (base: string, f: string) => readFileSync(join(base, f), "utf8");

if (!existsSync(join(TARGET, "SKILL.md"))) {
  console.error(`no zod-testing checkout at ${TARGET}; set ZOD_TESTING_ROOT`);
  process.exit(1);
}

// Links and the line that names the other copy differ between the two repositories.
const relink = (text: string) =>
  text
    .replaceAll("](testing-api.md)", "](references/api-reference.md)")
    .replaceAll("](testing-anti-patterns.md)", "](references/anti-patterns.md)")
    .replaceAll("[testing-anti-patterns.md]", "[references/anti-patterns.md]")
    .replace(
      "The zod-testing skill carries the same guide; `.github/check/sync-testing.ts` generates its copy from this file.",
      "The zod skill (anivar/zod-skill) carries the same guide as `references/testing.md`; this copy is generated from it.",
    );

const skillMd = read(TARGET, "SKILL.md");
const front = /^---\n[\s\S]*?\n---\n/.exec(skillMd)?.[0];
if (!front) {
  console.error(`${TARGET}/SKILL.md: no frontmatter`);
  process.exit(1);
}

const outputs: Record<string, string> = {
  "SKILL.md": `${front}\n${MARKER}\n\n${relink(read(ROOT, "references/testing.md"))}`,
  "references/api-reference.md": `${MARKER}\n\n${read(ROOT, "references/testing-api.md")}`,
  "references/anti-patterns.md": `${MARKER}\n\n${read(ROOT, "references/testing-anti-patterns.md")}`,
};

// Every link that the generated SKILL.md still points at a zod-skill-only file is a defect.
const leftovers = [...outputs["SKILL.md"].matchAll(/\]\((testing-[\w-]+\.md)\)/g)].map((m) => m[1]);
if (leftovers.length) {
  console.error(`SKILL.md would link to ${leftovers.join(", ")}, which zod-testing does not have`);
  process.exit(1);
}

const stale = Object.entries(outputs).filter(([f, text]) => !existsSync(join(TARGET, f)) || read(TARGET, f) !== text).map(([f]) => f);
if (process.argv.includes("--check")) {
  for (const f of stale) console.error(`zod-testing ${f} differs from the zod-skill source: run \`bun sync-testing.ts\` in zod-skill/.github/check`);
  process.exit(stale.length ? 1 : 0);
}
for (const f of stale) writeFileSync(join(TARGET, f), outputs[f]);
console.log(stale.length ? `wrote ${stale.join(", ")}` : "zod-testing is current");
