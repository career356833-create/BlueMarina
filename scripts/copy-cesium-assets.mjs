import { cpSync, copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve("cesium/package.json")), "Build", "Cesium");
const destination = path.join(process.cwd(), "public", "cesium");
mkdirSync(destination, { recursive: true });
for (const directory of ["Workers", "Assets", "ThirdParty", "Widgets"]) cpSync(path.join(source, directory), path.join(destination, directory), { recursive: true });

copyFileSync(path.join(path.dirname(require.resolve("cesium/package.json")), "LICENSE.md"), path.join(destination, "LICENSE.md"));

copyFileSync(path.join(source, "Cesium.js"), path.join(destination, "Cesium.js"));
