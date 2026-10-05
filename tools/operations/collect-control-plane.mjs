// Read-only CLI collector. Raw CLI output stays in process memory; only allowlisted aggregates are saved.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const output = process.argv[2];
if (!output) throw new Error("Provide an output JSON path; no implicit repository write.");
const model = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/operations/summary-model.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, model);
function cli(args) {
  // Arguments are fixed below, never derived from logs or user data.
  return execFileSync(process.platform === "win32" ? "vercel.cmd" : "vercel", args, {
    encoding: "utf8", timeout: 60000, maxBuffer: 12 * 1024 * 1024, shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"],
  });
}
const checkedAt = new Date().toISOString();
let production = null; let runtime = null;
try {
  const inspection = JSON.parse(cli(["inspect", "https://blue-marina.vercel.app", "--json"]));
  const deployments = JSON.parse(cli(["list", "blue-marina", "--prod", "--json"])).deployments;
  const current = deployments.find(d => d.url === inspection.url);
  const previous = deployments.find(d => d.state === "READY" && d.url !== inspection.url && d.createdAt < inspection.createdAt);
  const sha = value => /^[a-f0-9]{40}$/.test(value ?? "") ? value : null;
  production = { checkedAt, deploymentId: inspection.id, state: inspection.readyState,
    deployedSha: sha(current?.meta?.githubCommitSha), mainSha: sha(execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim()),
    deployedAt: new Date(inspection.createdAt).toISOString(),
    rollback: previous ? { url: `https://${previous.url}`, sha: sha(previous.meta?.githubCommitSha), state: "READY" } : null };
} catch { /* Missing control-plane permission must stay UNKNOWN. */ }
try {
  const lines = cli(["logs", "--environment", "production", "--since", "24h", "--until", checkedAt, "--limit", "1000", "--json"]);
  const rows = lines.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  runtime = { checkedAt, window: "24h", scope: "BOUNDED_REQUEST_LOG_SAMPLE", ...model.exports.summarizeRuntime(rows, 1000) };
} catch { /* No raw error output: CLI errors may contain private data. */ }
const destination = path.resolve(output);
mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(destination + ".tmp", JSON.stringify({ schemaVersion: 1, production, runtime }, null, 2) + "\n");
renameSync(destination + ".tmp", destination);
console.log(JSON.stringify({ production: !!production, runtime: !!runtime, saved: true }));
