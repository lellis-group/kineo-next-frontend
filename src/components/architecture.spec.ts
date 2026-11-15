import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SRC = join(import.meta.dir, "..");
const COMPONENTS = join(SRC, "components");

const LAYERS = ["atoms", "molecules", "organisms", "templates"] as const;
type Layer = (typeof LAYERS)[number];

/**
 * Atomic Design, enforced: a layer may compose the layers below it and
 * never the ones above.
 */
const ALLOWED: Record<Layer, readonly Layer[]> = {
  atoms: [],
  molecules: ["atoms"],
  organisms: ["atoms", "molecules"],
  templates: ["atoms", "molecules", "organisms"],
};

const IMPORT = /from\s+"([^"]+)"/g;

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

function importsOf(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(IMPORT)].flatMap(([, spec]) =>
    spec ? [spec] : [],
  );
}

function layerOf(specifier: string, file: string): Layer | null {
  const aliased = specifier.match(/^@\/components\/([a-z]+)\//);
  if (aliased) {
    const layer = aliased[1] as Layer;
    return LAYERS.includes(layer) ? layer : null;
  }

  if (!specifier.startsWith(".")) return null;

  const [head] = relative(COMPONENTS, resolve(file, "..", specifier)).split(
    "/",
  );
  return LAYERS.includes(head as Layer) ? (head as Layer) : null;
}

describe("component architecture", () => {
  for (const layer of LAYERS) {
    test(`${layer} only compose the layers below`, () => {
      const violations: string[] = [];

      for (const file of filesIn(join(SRC, "components", layer))) {
        for (const specifier of importsOf(file)) {
          const target = layerOf(specifier, file);
          if (!target || target === layer) continue;
          if (ALLOWED[layer].includes(target)) continue;
          violations.push(
            `${relative(SRC, file)}: ${layer} cannot import ${target} (${specifier})`,
          );
        }
      }

      expect(violations).toEqual([]);
    });
  }

  test("lib never imports a component", () => {
    const violations = filesIn(join(SRC, "lib")).flatMap((file) =>
      importsOf(file)
        .filter((specifier) => specifier.startsWith("@/components"))
        .map((specifier) => `${relative(SRC, file)}: ${specifier}`),
    );

    expect(violations).toEqual([]);
  });
});
