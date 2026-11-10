# Current state

Updated 2026-11-10. Owner: Kian, sole builder and decision owner.

## Current product direction: agent benchmarking

Ledgerly’s primary objective is now a local benchmarking platform for AI agent strategies. Invoice resolution remains the synthetic task domain and the original Resolution desk remains available. The benchmark UI is the default landing workspace.

- Added three benchmark adapters: the bounded Ledgerly tool agent, a direct single-pass baseline, and an independent LangGraph.js 1.6.1 single-pass graph. All use the same configured local Ollama model.
- Added core scenarios for authorized evidence, missing evidence, unauthorized acceptance, misleading source instructions, one injected tool-call failure, and unavailable-model behavior. The expanded selector uses the existing 28 synthetic evaluation cases.
- Added sequential repeat runs, per-attempt outcomes, model requests/steps, tool calls, prompt/output tokens, full latency percentiles, per-task repeat results, $0 local API-fee estimate, compact traces, and saved-run history. Per-request traces separate client duration from Ollama total/load/prompt/generation durations.
- Benchmark records use a separate SQLite table; invoice case reset does not clear benchmark history. A server restart marks an in-flight benchmark failed for explicit retry. Benchmark code does not call approval or SMTP routes.
- Added the primary Agent benchmark workspace while retaining the invoice Resolution desk. `@langchain/langgraph` 1.6.1 is MIT licensed and installed without any hosted platform or paid API.
- Verified on 2026-11-10: 134 automated tests, TypeScript and production build pass. Docker app image rebuilt and healthy; a Chromium smoke check returned HTTP 200 with no page errors. API catalog returns three adapters, six core scenarios and 28 expanded cases. A corrected live qwen3:1.7b core run completed three repeats (54 attempts); findings are in [evaluation results](evaluation-results.md).

The v3 benchmark contract gives each candidate the same serialized invoice facts, scoped evidence, authority facts, reviewed clause, decision rules, citation choices and structured output schema. A regression test verifies the tool agent receives no `policyStatus` labels in either its evidence response or follow-up prompt. The prior 2026-11-06 reported 18/18 tool-agent score is withdrawn because those labels were present while the single-pass candidates did not receive them. In the corrected 54-attempt run, the tool agent passed 12/18 overall (including 3/3 tool-failure recovery and 3/3 outage handling); direct and LangGraph single-pass passed 3/15 each (outage handling only) and failed all evidence cases. Model statuses and trace evidence are recorded accurately; production validation still rejects policy mismatches and unsupported authority. LangGraph runs the same single-pass logic through a two-node `StateGraph`; this demonstrates one independent adapter, not broad framework compatibility.

The 815.221-second historical single-pass delay is attributed to Windows Modern Standby. Two Modern Standby intervals were also logged during the corrected three-repeat run. Paired client/Ollama request timings are retained; no positive client-minus-Ollama gap exceeded 10 seconds, but report wall-clock measurements with the host-standby caveat. See the run record for sample size, per-repeat results and limitations.

See [agent benchmark platform plan](plans/agent-benchmark-platform.md), [product requirements](PRD.md), and [evaluation protocol](evaluation.md).

The invoice-resolution task-domain MVP is implemented and retained; the current primary product direction is the agent benchmark platform documented above. The benchmark workflow is demo-ready as a transparent evaluator, but the configured model does not meet the 90% branch-accuracy target (qwen3:1.7b tool agent is 66.7% across the narrow core suite). This is not a model-quality, production, or real-customer reliability sign-off. See [readiness review](readiness-review.md), [evaluation results](evaluation-results.md) and [verification](standards/verification.md).

## Implemented and retained

- React/TypeScript workspace with case/source/activity views, light/dark themes, collapsible sidebar, evidence viewer and responsive review cards.
- Fastify API, persistent SQLite, case-scoped CSV and selectable-text contract PDF imports, reviewed delivery/acceptance .txt or plain-text .eml sources.
- Exact human-reviewed billing clause for delivery plus written client acceptance. Uploads alone do not establish contractual support or client acceptance.
- Bounded local Ollama tools, model explanations and exact reviewed citations; application policy supplies statuses and validates case, scope, authority and citation coverage. Rules mode is explicitly labeled as no AI inference.
- Persisted asynchronous investigation jobs, progress, reload recovery and explicit retry. Failures clear findings and approval without a silent fallback.
- Cooperative reconciliation correspondence for complete evidence; internal blocker requests for missing, pending or conflicting evidence.
- Exact-message/evidence approval, independent action guards, stale-approval rejection and duplicate-send protection. Test SMTP only.
- PDF-only selectable-text evidence packs and controlled allowlisted live/cached GitHub delivery demonstration.
- Docker app/Ollama/Mailpit, named-volume persistence and backup/restore tools.

## Previous invoice-resolution verification (historical, 2026-11-05)

Pending or stale uploaded acceptance now blocks reliance on older acceptance until reviewed. A reviewed rejection remains conflicting; dismissing a non-acceptance record requires a new investigation. Supported model citations use the matching current reviewed source and passage; contract quotations must cover billing, delivery and written acceptance. Heading-only historical output is rejected before editing, approval, send or PDF export through one shared guard.

- 128 automated tests, TypeScript, production build and final Docker image passed; npm audit reports zero known vulnerabilities at the prior invoice-resolution release audit.
- Deployed CSS passes 20 theme/width/sidebar combinations without horizontal overflow. Three final-source browser rehearsals pass both branches, PDF downloads, approval and exactly-once Mailpit delivery.
- Actual qwen3:1.7b synthetic evaluation covers 28 scenarios. Initial pass: 27 valid responses and one Windows-sleep interruption. The interrupted case passed its explicit retry. Zero unsafe outcomes observed; completed-call p95 57.58 seconds. This is policy-assisted status agreement, not independent document interpretation or general semantic accuracy.
- Original uploaded synthetic case FEATURES-1793860312321 now cites its substantive billing clause, completes investigation in 76.048 seconds, survives browser reload, passes current approval/send/export validation and delivers the exact reviewed test message once. Its PDF has three visually checked selectable-text pages.
- Final runtime modules/assets match tested files. Restart preserves case, evidence, approval and delivery state; retry does not duplicate mail. App and Mailpit are healthy, model reachable and installed.
- Project Git root is isolated to this folder. Secrets, local data, dependencies and test artifacts remain ignored. Nothing staged, committed, pushed or externally deployed.

The optional pilot outcome/timing UI and endpoint remain removed at the user's request. Historical records/events are retained; these are not new product controls or proof of payment.

## Boundaries and next steps

This remains a local single-user prototype with declared sender/reviewer identities, explicit human review, test-only SMTP, text-only ingestion and controlled GitHub mapping. Other billing conditions, OCR, authenticated multi-user access, mailbox synchronization, accounting writeback, real customer email and payment execution remain outside this release.

Next: improve benchmark agent accuracy without reintroducing validator-label leakage; the qwen3:4b single-pass diagnostic performed better on three examples but failed the unauthorized-approver case, while its tool-agent diagnostic timed out. Keep qwen3:1.7b as the configured demo model until a complete candidate configuration passes the shared three-repeat gate. Keep cross-framework claims scoped to the one exercised LangGraph.js adapter. Review latency with host-sleep events and paired Ollama timings disclosed. Confirm deadline, rubric and hosting/submission requirements before final pitch/video packaging.

Additional API/hosting fees remain $0. The only new dependency is the MIT-licensed LangGraph.js package; local inference still uses Ollama. Existing hardware, storage, electricity and bandwidth remain prerequisites. No permanent power setting was changed.
