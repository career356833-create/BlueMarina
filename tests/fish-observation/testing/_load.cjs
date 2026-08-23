const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../../..");
const cache = new Map();

function loadTs(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const baseRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request === "server-only") return {};
    if (request.startsWith(".")) {
      const resolved = path.resolve(path.dirname(file), request);
      if (fs.existsSync(`${resolved}.ts`)) return loadTs(path.relative(root, `${resolved}.ts`));
      if (fs.existsSync(path.join(resolved, "index.ts"))) return loadTs(path.relative(root, path.join(resolved, "index.ts")));
    }
    return baseRequire(request);
  };
  mod._compile(output, file);
  return mod.exports;
}

const readyConfig = (overrides = {}) => ({
  enabled: true,
  environment: "staging",
  projectRef: "mlfvpaikfpjrgrhwlrjn",
  ...overrides,
});

module.exports = { loadTs, readyConfig, root };
