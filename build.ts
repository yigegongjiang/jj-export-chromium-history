import { readdir, unlink } from "node:fs/promises";

import pkg from "./package.json" with { type: "json" };

const TARGETS = ["bun-darwin-x64", "bun-darwin-arm64"] as const;

try {
  for (const target of TARGETS) {
    const suffix = target.replace(/^bun-/, "");
    const outfile = `./dist/${pkg.name}-${suffix}`;
    const result = await Bun.build({
      entrypoints: ["./src/index.ts"],
      minify: true,
      compile: { outfile, target },
    });
    if (!result.success) {
      for (const log of result.logs) console.error(log);
      throw new Error(`build failed for ${target}`);
    }
    console.log(`built: ${outfile}`);
  }
} finally {
  // `bun build --compile` leaves `.<hash>-<index>.bun-build` intermediates in cwd.
  const root = await readdir(".");
  await Promise.all(
    root.filter((n) => n.endsWith(".bun-build")).map((n) => unlink(n).catch(() => {})),
  );
}
