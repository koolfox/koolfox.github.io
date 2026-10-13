// Copy locked browser distributions, licenses and exact byte hashes for static Pages hosting.
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const project = resolve(directory, "..");
const lock = JSON.parse(await readFile(resolve(directory, "package-lock.json"), "utf8"));
const manifest = {
  generated_at_utc: new Date().toISOString(),
  command: "npm ci --prefix structural-bioinformatics/reading-tools --ignore-scripts; " +
    "npm --prefix structural-bioinformatics/reading-tools run vendor",
  runtime_dependency: "None at site runtime: all browser assets are self-hosted and loaded on demand",
  packages: [],
  files: [],
};

async function copyAsset(name, sourceRelative, destinationRelative) {
  const input = resolve(directory, "node_modules", name, sourceRelative);
  const path = `assets/vendor/${name}/${destinationRelative}`;
  const output = resolve(project, path);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(input, output);
  const bytes = await readFile(output);
  manifest.files.push({
    path,
    package: name,
    upstream_path: sourceRelative,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

for (const [name, repository] of [
  ["markdown-it", "https://github.com/markdown-it/markdown-it"],
  ["katex", "https://github.com/KaTeX/KaTeX"],
  ["mermaid", "https://github.com/mermaid-js/mermaid"],
]) {
  const information = JSON.parse(await readFile(resolve(directory, "node_modules", name, "package.json"), "utf8"));
  const locked = lock.packages[`node_modules/${name}`];
  manifest.packages.push({
    name,
    version: information.version,
    license: information.license,
    repository,
    distribution: locked.resolved,
    npm_integrity: locked.integrity,
  });
  await copyAsset(name, "LICENSE", "LICENSE.txt");
}

await copyAsset("markdown-it", "dist/browser/markdown-it.umd.min.js", "markdown-it.min.js");
await copyAsset("katex", "dist/katex.min.js", "katex.min.js");
await copyAsset("katex", "dist/katex.min.css", "katex.min.css");
await copyAsset("katex", "dist/contrib/auto-render.min.js", "auto-render.min.js");
for (const name of (await readdir(resolve(directory, "node_modules/katex/dist/fonts"))).sort()) {
  if (/\.(woff2?|ttf)$/.test(name)) await copyAsset("katex", `dist/fonts/${name}`, `fonts/${name}`);
}
await copyAsset("mermaid", "dist/mermaid.min.js", "mermaid.min.js");
await writeFile(resolve(project, "data/metadata/reading-vendor.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Vendored ${manifest.files.length} files from three locked MIT distributions.`);
