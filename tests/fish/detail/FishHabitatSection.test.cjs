"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");
const { createRequire } = require("node:module");
const { renderToStaticMarkup } = require("react-dom/server");

const rootDir = path.resolve(__dirname, "../../../");
const previewReportPath = path.join(rootDir, "reports", "nifs-fish-detail-read-model-preview.json");
const componentPath = path.join(rootDir, "src", "components", "fish", "detail", "FishHabitatSection.tsx");
const previewPath = path.join(rootDir, "src", "components", "fish", "detail", "FishHabitatSectionPreview.tsx");

function resolveLocalImport(fromFile, request) {
  const basePath = path.resolve(path.dirname(fromFile), request);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function loadTsModule(filePath, cache = new Map()) {
  const resolved = path.resolve(filePath);

  if (cache.has(resolved)) {
    return cache.get(resolved).exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: resolved,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      resolveJsonModule: true,
      skipLibCheck: true,
      isolatedModules: true,
    },
  });

  const mod = { exports: {} };
  cache.set(resolved, mod);
  const nativeRequire = createRequire(resolved);

  function localRequire(request) {
    if (request.startsWith(".") || request.startsWith("..")) {
      const candidate = resolveLocalImport(resolved, request);
      if (candidate) {
        if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) {
          return loadTsModule(candidate, cache);
        }
        return nativeRequire(candidate);
      }
    }

    return nativeRequire(request);
  }

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __filename: resolved,
    __dirname: path.dirname(resolved),
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  vm.runInNewContext(outputText, sandbox, { filename: resolved });
  return mod.exports;
}

function getDefaultExport(mod) {
  return mod?.default ?? mod?.FishHabitatSection ?? mod;
}

function renderComponent(Component, props) {
  return renderToStaticMarkup(React.createElement(Component, props));
}

const previewData = JSON.parse(fs.readFileSync(previewReportPath, "utf8"));

const FishHabitatSection = getDefaultExport(loadTsModule(componentPath));
const FishHabitatSectionPreview = getDefaultExport(loadTsModule(previewPath));

test("renders habitat when text exists", () => {
  const fish = previewData.previewRecords.find((record) => record.sourceId === "fish_1576639605223");
  assert.ok(fish);

  const markup = renderComponent(FishHabitatSection, {
    habitat: fish.habitat,
    habitatSourceStatus: "present",
  });

  assert.match(markup, /서식 환경/);
  assert.match(markup, /우리나라 동해, 남해 일본, 동중국해/);
});

test("hides the section when habitat is null", () => {
  const markup = renderComponent(FishHabitatSection, {
    habitat: null,
    habitatSourceStatus: "source_missing",
  });

  assert.equal(markup, "");
});

test("escapes HTML and preserves long raw habitat text", () => {
  const markup = renderComponent(FishHabitatSection, {
    habitat: "서식지: 연안 <script>alert(1)</script>\n\n개방된 해역",
    habitatSourceStatus: "present",
  });

  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>alert\(1\)<\/script>/);
  assert.match(markup, /개방된 해역/);
});

test("preview fixture renders representative cases", () => {
  const markup = renderComponent(FishHabitatSectionPreview, {});

  assert.match(markup, /붉은대게/);
  assert.match(markup, /기름가자미/);
  assert.match(markup, /특수문자 확인/);
  assert.match(markup, /서식 정보 없음/);
  assert.match(markup, /섹션이 렌더링되지 않아야 하는 케이스입니다\./);
  assert.match(markup, /max-w-\[390px\]/);
});
