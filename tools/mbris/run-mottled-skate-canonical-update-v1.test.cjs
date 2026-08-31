const assert = require("node:assert/strict");
const test = require("node:test");
const { adminDetailSql, updateSql } = require("./run-mottled-skate-canonical-update-v1.cjs");

test("admin detail inspection is read only", () => {
  const sql = adminDetailSql();
  assert.match(sql, /begin read only/i);
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|alter|drop|create|truncate)\b/i);
});

test("canonical update is narrowly scoped and idempotent", () => {
  const sql = updateSql();
  assert.match(sql, /where id='1f158822-5672-4174-b44a-2237496b9504'::uuid and scientific_name='Raja pulchra'/);
  assert.match(sql, /scientific_name='Beringraja pulchra'/);
  assert.match(sql, /'Raja pulchra',lower\('Raja pulchra'\),'scientific','official','approved'/);
  assert.match(sql, /where not exists \(select 1 from public\.fish_aliases/);
  assert.match(sql, /where not exists \(select 1 from public\.fish_species_sources/);
  assert.match(sql, /where not exists \(select 1 from public\.fish_change_logs/);
  assert.match(sql, /MOTTLED_SKATE_NIFS_RELATION_LOST/);
  assert.doesNotMatch(sql, /insert into public\.fish_species\s*\(/i);
  assert.doesNotMatch(sql, /\b(?:alter|drop|create|truncate)\b/i);
});

test("update preserves name and slug while enforcing species total", () => {
  const sql = updateSql();
  assert.match(sql, /korean_name='참홍어'/);
  assert.match(sql, /slug='mottled-skate'/);
  assert.match(sql, /<> 1258/);
  assert.match(sql, /commit;/i);
});
