# Ledgerly readiness review

Updated 2026-11-10. Scope: local AI-agent benchmarking platform, with invoice evidence as the synthetic task domain. Kian remains the sole builder and decision owner.

## Benchmark-platform readiness

The containerized benchmark interface, persistent run history, common evidence/citation checks and execution traces are operational. On 2026-11-10, code review found the previous tool-agent benchmark prompt received deterministic policy-status labels that the single-pass candidates did not. The reported tool-agent 18/18 score is withdrawn as an unfair comparison. A v3 contract now withholds those labels from every candidate and records wrong model decisions as `incorrect` while leaving production policy checks strict.

The corrected three-repeat fair core run completed 54/54 attempts (run `e3dd1e49-5d40-4cd2-b03c-9dfce4654804`). On the four common evidence cases, the tool agent scored 6/12 (50%); direct single-pass and LangGraph.js each scored 0/12. The tool agent also recovered from the injected tool failure 3/3, while single-pass adapters report that fault as unsupported; all three handled model outage 3/3. The configured model misses the 90% benchmark target, so the project is **GO for a scoped, honest synthetic benchmark demo; NO-GO for model-reliability or production claims**. See [current evaluation results](evaluation-results.md).

The demo stack is running locally: app health is OK, Ollama reports qwen3:1.7b installed and reachable, and Mailpit is healthy. The first corrected run persisted across an app-container rebuild. No real customer data, paid API, hosted inference, external delivery or payment was used.

The existing invoice-desk recommendation below is historical and applies only to its scoped synthetic workflow; it does not establish agent-benchmark accuracy.

Historical invoice-desk recommendation: **GO for the scoped local synthetic demo, with the boundaries below.** The reproduced audit defects are corrected. These results do not establish production financial reliability or validated market value.

## Defects corrected

| Finding | Correction and evidence |
| --- | --- |
| Pending withdrawal ignored in favor of older acceptance | Pending/stale uploaded acceptance takes priority over prior support. Reviewed rejection conflicts; explicit not-acceptance dismissal clears investigation/approval and requires reinvestigation. Scope and independent approval/send regressions pass. |
| Heading-only contract citation | Generation offers requirement-specific reviewed excerpts. Supported citations require matching source types/current policy sources and exact reviewed passages. Contract quotes must cover billing, delivery and written acceptance together. Exact headings and incomplete conditions are rejected. Human-reviewed contextual acceptance wording remains supported. |
| Historical saved result bypass | Shared current validation checks raw stored model findings and displayed citations before editing, approval, sending and PDF export, including direct PDF rendering. Actual historical FEATURES case returned 409 for approval/send/export, then passed after fresh inference. |
| 1024px horizontal overflow | Root cause was the draft Send to test inbox action row, correcting the audit's initial attribution to Investigate. Action/control rows now wrap. Final deployed CSS passed both themes, sidebar shown/hidden and 320/390/768/1024/1440px. |
| Parent-folder Git root | Independent project repository initialized. Git resolves to C:/Users/KIAN FLORENDO/invoice-resolution-agent; secrets/data/artifacts stay ignored. No stage, commit, push or deployment. |

Original defect evidence remains under test-results/readiness. Correction evidence is under ignored test-results/readiness-fixes; implementation plan: [readiness corrections](plans/readiness-fixes.md).

## Verification

- All 124 automated unit/API/regression tests pass, including failed/empty/stale findings, source/context changes, pending withdrawals, legacy model output and PDF guards. TypeScript, production build, final Docker build/configuration and dependency audit pass; zero known dependency vulnerabilities were reported.
- Three consecutive final-source isolated in-memory Chrome rehearsals pass both original branches. Six synthetic .example emails reached actual local Mailpit with exact approved content and no duplicates. Six PDF downloads/MIME checks and source-dialog keyboard/Escape behavior pass. Persistent application records were not changed by these isolated rehearsals.
- Twenty deployed-CSS layout combinations pass without overflow, escaped controls, sticky-draft containment errors, removed pilot UI or page/console errors.
- Actual qwen3:1.7b Q4_K_M CPU model coverage: 28 scenarios, including four new readiness regressions. Initial pass returned 27 valid expected-status responses; one subprocess timed out while Windows entered Modern Standby. Kernel-Power events 506/507 confirm standby from 20:47:26 to 20:52:34 Asia/Manila. That failed attempt remains recorded. Its explicit retry passed in 38.056 seconds. All 28 scenarios therefore have a passing result, with zero unsafe outcomes observed across 29 attempts. Completed-call p95 is 57.58 seconds, maximum 63.25 seconds; the interrupted call is excluded from this completion-latency percentile. Cold/warm timing is not separately established.
- Targeted heading-heavy contract citation oracle passed 1/1. This and the new citation coverage guard do not establish unrestricted semantic entailment or independent model status reasoning: application policy supplies the statuses.
- Original uploaded synthetic FEATURES-1793860312321 passed actual Ollama in 76.048 seconds, with the exact substantive billing clause replacing its historical heading-only citation. Browser reload recovered progress; exact reviewed correspondence reached Mailpit once despite retry, and the three-page PDF downloaded and passed text/visual checks.
- Final runtime source/assets match tested hashes. Container restart preserved the corrected case exactly, PDF remained valid, model remained reachable/available and duplicate send remained idempotent. Temporary sleep prevention was released without changing permanent settings.

Artifacts: test-results/readiness-fixes/{automated-tests.log,consolidated-model.json,source-manifest.json,runtime-hashes.json,restart.json,power-events.json}; model/, sleep-retry/, layout/, rehearsal/ and uploaded/ contain raw records, proof scripts, screenshots and PDFs. These local artifacts are ignored to avoid publishing records/test output unintentionally.

## Objective and cost alignment

The original agency workflow remains intact: import evidence, correlate contract/delivery/acceptance, expose blockers, prepare cooperative correspondence, require exact review/approval and preserve test-delivery history. No planned feature was removed for these fixes. The optional pilot panel remains removed because the user requested its removal earlier.

The bounded AI workflow selects evidence tools and produces explanations/citations; application policy, declared human review and approval govern the next action. Delivery remains distinct from acceptance; prepared/sent remains distinct from payment.

The existing local app/SQLite, Ollama and Mailpit require no paid model API, hosted PDF service, billing activation or trial credit. Additional service/API spend for these changes is $0; no new package dependency was added. Existing hardware/storage/power/bandwidth are separate resources. Source licensing/submission access remains an owner decision; no publication occurred.

## Remaining validation

Only synthetic records have been demonstrated. Sender/reviewer identities are declarations; the application is local and single-user with test-only SMTP. Text-only ingestion and the specific delivery-plus-written-acceptance billing rule limit scope. No autonomous collection, payment execution, authenticated financial authorization or general legal interpretation is claimed.

Prism recommendation: next compare one unseen, consented agency packet with manual preparation and record time to a correctly prepared, reviewer-approved action outside the removed pilot UI. Recurring customer pain, willingness to pay, time saved, DSO impact and recovered cash remain hypotheses. Any unsupported client-ready outcome or materially insufficient citation blocks a real-record pilot. Deadline/rubric/hosting requirements remain to be confirmed before submission packaging.
