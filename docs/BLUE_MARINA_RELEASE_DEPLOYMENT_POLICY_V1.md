# Blue Marina release deployment policy V1

## Current behavior
Main is the Vercel Production branch. Git pushes, including documentation-only changes, can create Production deployments. This task does not change Vercel configuration. A successful push is not evidence of READY; verify the production alias, deployment ID and Git SHA.

The implementation pushes in this task auto-deployed without a manual deployment command or configuration change. Current READY on the operations page is read from the existing public GitHub/Vercel Production status and requires the running SHA and exact deployment URL to match. Lookup failure is UNKNOWN. Final evidence-only pushes still use the same auto-deploy policy.

## Recommended policy
Keep the present configuration until a separate approved change. The preferred operating policy is Preview verification followed by explicit promotion/release approval. Preview and Production Auth URLs, source flags and secrets must be equivalent before promotion; never promote a preview artifact built against the wrong backend. Where environments differ, build the approved SHA with Production environment and verify before moving traffic.

Path-based ignored builds are not recommended yet: reports and versioned JSON are imported by runtime code, so blanket docs/reports/data exclusions can omit functional changes. Documentation-only pushes should be batched and monitored under the current auto-deploy behavior. Distinguish pure prose from imported runtime evidence.

## Release checklist
1. Exact scoped commit; preserve unrelated worktree. Clean-checkout test, typecheck, lint and build.
2. Record current alias deployment and previous READY rollback target.
3. Verify new deployment READY, deployed SHA and origin/main match.
4. Smoke private authorization, operations aggregates and representative public routes. HTTP 200 does not prove map canvas or physical GPS.
5. Revoke temporary QA roles and sessions; retain no credentials in reports.

## Rollback
The deployment/control-plane audit on the operations page records a timestamped previous READY candidate. Recheck it in Vercel before rollback; it is not an automatic target selection or approval.

Use `vercel rollback <verified-previous-deployment-url>` after incident review. Recheck aliases, Auth callbacks and feature flags. Deployment rollback does not undo a database migration, data writes, Storage changes or environment changes. Feature flags require a separate configuration rollback and possibly a rebuild/redeploy. Database recovery requires a separately reviewed forward fix or tested backup restore; never run inverse DDL automatically.

## Observability refresh
`node tools/operations/collect-control-plane.mjs <review-output.json>` reads Vercel deployments and a maximum 1000 request logs in the last 24 hours. Only allowlisted aggregates are written. Review the result before replacing `src/data/operations/control-plane-v1.json`; this is historical evidence, not a streaming logger. Missing permission is UNKNOWN, a bounded zero is not a zero-error guarantee.

The security artifact is a separately timestamped read-only Supabase catalog/advisor audit. Refresh through approved read-only tooling; no RLS/credential changes are part of an observability refresh. Never commit raw logs, environment files, auth identities or session tokens.

Reference: [Vercel managing deployments](https://vercel.com/docs/deployments/managing-deployments), [ignored build step](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step), [GitHub deployment statuses](https://docs.github.com/en/rest/deployments/statuses?apiVersion=2022-11-28).
