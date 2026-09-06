const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const normalizerPath = path.join(root, "src/lib/sea-info/tide-observation-normalize.ts");

function loadTs(file) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const normalizer = loadTs(normalizerPath);

test("normalizes the latest source-backed observed tide level in documented centimeters", () => {
  const result = normalizer.parseKhoaTideObservationPayload({
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
      body: { items: { item: [
        { obsvtrNm: "부산", obsrvnDt: "2026-09-06 08:00", bscTdlvHgt: "121.0", tdlvHgt: "119.0" },
        { obsvtrNm: "부산", obsrvnDt: "2026-09-06 09:00", bscTdlvHgt: "128.0", tdlvHgt: "126.0" },
      ] } },
    },
  }, "DT_0005", "20260906");
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "ready");
  assert.deepEqual(result.data.observation, { observedAt: "2026-09-06T09:00:00+09:00", levelCm: 128 });
  assert.equal(result.data.metadata.levelUnit, "cm");
  assert.equal(result.data.metadata.datumStatus, "DATUM_NOT_DOCUMENTED");
});

test("does not substitute prediction when the observed field is absent", () => {
  const result = normalizer.parseKhoaTideObservationPayload({
    response: { header: { resultCode: "00" }, body: { items: { item: { obsvtrNm: "부산", obsrvnDt: "2026-09-06 09:00", tdlvHgt: "126.0" } } } },
  }, "DT_0005", "20260906");
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "unavailable");
  assert.equal(result.data.observation, undefined);
});

test("distinguishes missing observed values from a real numeric zero", () => {
  for (const value of [undefined, null, ""]) {
    const item = { obsvtrNm: "부산", obsrvnDt: "2026-09-06 09:00", bscTdlvHgt: value };
    if (value === undefined) delete item.bscTdlvHgt;
    const result = normalizer.parseKhoaTideObservationPayload({
      response: { header: { resultCode: "00" }, body: { items: { item } } },
    }, "DT_0005", "20260906");
    assert.equal(result.ok, true);
    assert.equal(result.data.status, "unavailable");
    assert.equal(result.data.observation, undefined);
  }

  for (const value of ["0", 0]) {
    const result = normalizer.parseKhoaTideObservationPayload({
      response: { header: { resultCode: "00" }, body: { items: { item: { obsvtrNm: "부산", obsrvnDt: "2026-09-06 09:00", bscTdlvHgt: value } } } },
    }, "DT_0005", "20260906");
    assert.equal(result.ok, true);
    assert.equal(result.data.status, "ready");
    assert.equal(result.data.observation.levelCm, 0);
  }
});

test("rejects upstream errors and unsupported response shapes", () => {
  assert.equal(normalizer.parseKhoaTideObservationPayload({ response: { header: { resultCode: "30", resultMsg: "DENIED" }, body: {} } }, "DT_0005", "20260906").code, "UPSTREAM_ERROR");
  assert.equal(normalizer.parseKhoaTideObservationPayload({ response: { header: { resultCode: "00" } } }, "DT_0005", "20260906").code, "UNSUPPORTED_UPSTREAM_SCHEMA");
});
