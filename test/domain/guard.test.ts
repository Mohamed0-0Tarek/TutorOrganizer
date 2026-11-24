import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DOMAIN_DIR = join(process.cwd(), "src", "domain");

const FORBIDDEN_IMPORT =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](react|react-dom|next(?:\/[^"']*)?|firebase(?:\/[^"']*)?|@firebase\/[^"']*|@google\/[^"']*|@\/data[^"']*|@\/components[^"']*|@\/app[^"']*)["']/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith(".ts")
        ? [full]
        : [];
  });
}

describe("domain purity", () => {
  it("imports nothing from React, Next, Firebase or the UI/data layers", () => {
    const files = walk(DOMAIN_DIR);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((file) =>
      FORBIDDEN_IMPORT.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("uses only relative imports inside the domain", () => {
    const files = walk(DOMAIN_DIR);
    const badSpecifier = /from\s+["']@\//;
    const offenders = files.filter((file) =>
      badSpecifier.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
