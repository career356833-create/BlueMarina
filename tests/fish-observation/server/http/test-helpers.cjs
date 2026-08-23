const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const root = path.resolve(__dirname, "../../../..");
const cache = new Map();

function loadTs(relative) {
  const file = path.join(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const originalRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request.startsWith(".")) {
      const base = path.resolve(path.dirname(file), request);
      if (fs.existsSync(`${base}.ts`)) return loadTs(path.relative(root, `${base}.ts`));
      if (fs.existsSync(path.join(base, "index.ts"))) return loadTs(path.relative(root, path.join(base, "index.ts")));
    }
    return originalRequire(request);
  };
  mod._compile(output, file);
  return mod.exports;
}

function createFakeContext(overrides = {}) {
  const calls = { auth: 0, limiter: 0, upload: 0, finalize: 0, delete: 0, publish: 0 };
  const ctx = {
    enabled: true,
    allowedOrigins: ["https://app.test"],
    auth: {
      authenticate: async () => {
        calls.auth += 1;
        return { actorUserId: "user-1", authRole: "user", fishRole: "fish_reviewer", requestId: "req-1" };
      },
    },
    limiter: {
      consume: async () => {
        calls.limiter += 1;
        return { allowed: true };
      },
    },
    gateway: {
      createObservationUpload: async (input) => {
        calls.upload += 1;
        return { kind: "upload", input };
      },
      finalizeObservationUpload: async (input) => {
        calls.finalize += 1;
        return { kind: "finalize", input };
      },
      requestMediaDeletion: async (input) => {
        calls.delete += 1;
        return { kind: "delete", input };
      },
      publishObservationMedia: async (input) => {
        calls.publish += 1;
        return { kind: "publish", input };
      },
    },
    ...overrides,
  };
  return { ctx, calls };
}

module.exports = { assert, loadTs, createFakeContext };
