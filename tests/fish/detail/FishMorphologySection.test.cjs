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
const componentPath = path.join(rootDir, "src", "components", "fish", "detail", "FishMorphologySection.tsx");
const previewPath = path.join(rootDir, "src", "components", "fish", "detail", "FishMorphologySectionPreview.tsx");

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
  return mod?.default ?? mod?.FishMorphologySection ?? mod;
}

function renderComponent(Component, props) {
  return renderToStaticMarkup(React.createElement(Component, props));
}

const previewData = JSON.parse(fs.readFileSync(previewReportPath, "utf8"));

const FishMorphologySection = getDefaultExport(loadTsModule(componentPath));
const FishMorphologySectionPreview = getDefaultExport(loadTsModule(previewPath));

test("renders morphology and hides feature subsection when the feature source is missing", () => {
  const fish = previewData.previewRecords.find((record) => record.sourceId === "fish_1573537097812");
  assert.ok(fish);

  const markup = renderComponent(FishMorphologySection, {
    morphology: fish.morphology,
    morphologySourceStatus: fish.morphologySourceStatus,
    distinguishingFeatures: ["가시", "점액공"],
    featureSourceStatus: "source_missing",
  });

  assert.match(markup, /형태와 생김새/);
  assert.match(markup, /국립수산과학원 공식 어종정보/);
  assert.doesNotMatch(markup, /구별되는 특징/);
});

test("renders structured features and escapes HTML in raw morphology text", () => {
  const fish = previewData.previewRecords.find((record) => record.sourceId === "fish_1576639605223");
  assert.ok(fish);

  const markup = renderComponent(FishMorphologySection, {
    morphology: `${fish.morphology}\n\n추가 문단 <script>alert(1)</script>`,
    morphologySourceStatus: fish.morphologySourceStatus,
    distinguishingFeatures: [
      "주둥이가 짧다",
      {
        body: "몸이 길다",
        fins: ["꼬리지느러미가 둥글다"],
      },
    ],
    featureSourceStatus: "present",
  });

  assert.match(markup, /구별되는 특징/);
  assert.match(markup, /주둥이가 짧다/);
  assert.match(markup, /몸이 길다/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>alert\(1\)<\/script>/);
});

test("hides the entire section when morphology is missing", () => {
  const markup = renderComponent(FishMorphologySection, {
    morphology: null,
    morphologySourceStatus: "source_missing",
    distinguishingFeatures: null,
    featureSourceStatus: "source_missing",
  });

  assert.equal(markup, "");
});

test("preview fixture renders representative sample cards", () => {
  const markup = renderComponent(FishMorphologySectionPreview, {});

  assert.match(markup, /붉은대게/);
  assert.match(markup, /기름가자미/);
  assert.match(markup, /형태 정보 없음 검증/);
  assert.match(markup, /섹션이 렌더링되지 않아야 하는 케이스입니다\./);
  assert.match(markup, /max-w-\[390px\]/);
});
