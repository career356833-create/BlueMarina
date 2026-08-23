const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../..");
const remoteAudit = require(path.join(root, "tools/supabase-audit/audit-remote-schema.cjs"));
const draftCompare = require(path.join(root, "tools/supabase-audit/compare-fish-drafts.cjs"));

test("remote audit queries are select-only and dry-run does not claim remote access", () => {
  for (const query of remoteAudit.AUDIT_QUERIES) {
    assert.doesNotThrow(() => remoteAudit.assertReadOnlyQuery(query));
    assert.match(remoteAudit.buildReadOnlyCommand(query).at(-1), /^begin read only; select/i);
  }
  assert.equal(remoteAudit.dryRunReport().remoteAccessed, false);
  assert.equal(remoteAudit.dryRunReport().status, "BLOCKED");
  assert.throws(() => remoteAudit.assertReadOnlyQuery("delete from public.fish_media"), /AUDIT_QUERY_NOT_READ_ONLY/);
});

test("remote audit parses a PostgreSQL URL without returning its secret", () => {
  const env = remoteAudit.buildPsqlEnvironment("postgresql://blue_marina_readonly_auditor.fakeprojectref:secret-value@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require");
  assert.equal(env.PGHOST, "aws-0-ap-northeast-1.pooler.supabase.com");
  assert.equal(env.PGPORT, "5432");
  assert.equal(env.PGUSER, "blue_marina_readonly_auditor.fakeprojectref");
  assert.equal(env.PGDATABASE, "postgres");
  assert.equal(env.PGOPTIONS, "-c default_transaction_read_only=on");
});

test("draft comparison verifies the fixed three-file dependency chain", () => {
  const result = draftCompare.compareFishDrafts(root);
  assert.equal(result.allPresent, true);
  assert.deepEqual(result.requiredOrder, [
    "202608030001_blue_marina_fish_domain_final_schema.sql",
    "202608030002_confirm_fish_observation_rpc.sql",
    "202608030003_fish_observation_storage_policy.sql"
  ]);
});

test("saved inventory reports no secrets or application row data", () => {
  const inventory = JSON.parse(fs.readFileSync(path.join(root, "reports/fish-supabase-remote-inventory-post-phase1.json"), "utf8"));
  const conflicts = JSON.parse(fs.readFileSync(path.join(root, "reports/fish-supabase-remote-conflicts-post-phase1.json"), "utf8"));
  const serialized = JSON.stringify(inventory);
  assert.doesNotMatch(serialized, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(serialized, /(?:service_role|anon)_key\s*[=:]/i);
  assert.doesNotMatch(serialized, /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/);
  if (inventory.status === "READY") {
    assert.equal(inventory.remoteAccessed, true);
    assert.equal(inventory.failedCount, 0);
    assert.equal(inventory.result.every((item) => item.status === "success"), true);
    assert.equal(conflicts.remoteInventoryStatus, "READY");
  } else {
    assert.equal(inventory.remoteAccessed, false);
    assert.equal(conflicts.remoteInventoryStatus, "BLOCKED");
  }
});
