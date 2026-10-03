# Blue Marina clean-main release reconciliation V2

Date: 2026-10-03. This record closes the release-only recovery started from `53c6111cbf1eb2ad1bfeb2ce0e1e98a44c9fac5e`. Production deployment, Supabase, and Vercel settings are outside this work.

## Release-critical recovery

Commit `f147e7beef72f20ea75f86ddff0b790bdd3c6a39` contains exactly four files: `next.config.ts` (`/reservations` private/no-store), `src/app/fishing-spots/fishing-spots-client.tsx` (results anchor), `src/components/boat/home/FishingExperienceSection.tsx` (source-backed Fishing Spot and target species links), and `src/components/boat/home/FishingWaterTemperatureCard.tsx` (explicit station selection, source time/freshness, unavailable state). It does not imply that a station reading is the spot's water temperature or that a spot is suitable for fishing. The isolated four-file checkout passed 42 targeted tests, typecheck, relevant-source lint, and build. The unchanged clean-main lint command still referenced an untracked research tool at that point.

## Full test inventory and decision

The previous V1 audit reported 82 failures on its checkout. A new Windows default checkout of the recovered commit reproduced **84 failures** (1146 pass, 1 skip). The two results use different checkout states, so the old 82 cannot be mapped test-by-test without its full failure log. The 84 independently observed failures are completely classified below; the extra two are not presented as identified historical test cases.

| Category | Count | Evidence and action |
| --- | ---: | --- |
| A — missing required fixture | 2 | Final canonical exception closure requires the two 3–7 KiB MBRIS detail records named below. Their SHA-256 values match the committed closure report. Add only these records. |
| B — missing required tool | 0 | `tools/species-importer` is untracked research tooling, not a release lint prerequisite. Remove its nonexistent path from the release lint command; recover no tool. |
| C — stale test expectation | 2 | The AI Captain test still asserted an old fixed/floating placement while the committed content-page safe-area is document-relative. Update assertions to the current committed layout without changing the widget or CSS. |
| D — test depends on uncommitted experiment | 8 | Six Fish Observation draft-schema/RPC test files produced eight failures because draft SQL, audit tools, and reports are outside committed main and outside the live migration chain. Rename them `.research.cjs`, preserving their content and directory, and provide `npm run test:fish-research` for explicit research validation. |
| E — real main bug | 0 | No additional runtime defect was established by these failures. |
| F — environment only | 72 | Byte-pinned audit inputs checked out with CRLF or LF according to the machine's `core.autocrlf`, while the historical snapshots contain a deliberate mixture. The same tests dropped from 84 to 12 failures after restoring only the original byte endings of otherwise clean tracked inputs. Pin stable checkout endings in `.gitattributes` (LF default, explicit CRLF for the legacy MBRIS/boat inputs). No source data values change. |
| G — unknown | 0 | Every independently reproduced failure has an identified cause. |

The intermediate LF-only checkout had 31 failures, and the LF checkout with the 73 relevant legacy CRLF inputs restored had 12. Adding the two source fixtures, updating the two UI assertions, and taking the draft tests out of the release suite reduced the isolated proposed file set to **1230 pass, 0 fail, 1 existing skip**. The dedicated research tests remain available and may fail until their separate, uncommitted draft prerequisites are provided; they are not evidence of a release runtime failure.

### Exact recovery list

- **Fixtures to add:** `data/mbris/normalized/detail/BM-SPECIES-002418.json`, `data/mbris/normalized/detail/BM-SPECIES-000279.json`. They are the two explicit `sources` of `reports/fish-canonical/final-exception-closure-v1.json`; no detail directory sweep is included.
- **Test to update:** `tests/fishing-condition/ui-v1-1.test.cjs` only.
- **Tools to add:** none.
- **Real bug files:** none beyond the four-file first commit.
- **Research tests to remove from the release glob:** `tests/fish-observation/migration/fish-domain-draft-consistency`, `fish-staging-incremental-schema`, `fish-staging-migration-order`, `fish-staging-rpc-security`, `fish-supabase-remote-audit-tools`, and `tests/fish-observation/rpc/confirm-fish-observation-rpc-contract` (`.test.cjs` to `.research.cjs` in the same directory).
- **Test configuration:** `.gitattributes` pins byte-sensitive checkout endings; `package.json` removes the nonexistent research directory from `lint` and adds the explicit Fish research test command.
- **Not recovering:** the rest of `data/mbris/normalized/detail`, Fish Observation draft migrations, research reports/dumps, `tools/species-importer`, logs, caches, generated build output, and the V1 audit's six RELEASE_USEFUL files.

## Verification boundary

The isolated proposed file set passed `npm test` (1230/1230, 1 existing skip), `npm run typecheck`, and `npm run lint`. Its build passed with the existing Supabase Edge-runtime bundling warning. A fresh clone of the final committed main must repeat all four commands and `git diff --check`; only that check confirms the checkout attributes and committed files work together. No product-facing feature, remote mutation, or deployment is included.

The earlier V1 audit files and all other tracked/untracked worktree changes remain separate. Marine-source timing experiments, chatbot cosmetic work, research data, and temporary outputs stay deferred.
