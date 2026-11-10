# Verification record

## Fair benchmark correction, 2026-11-10

| Command/check | Result |
| --- | --- |
| `npm test` | 134 tests passed, including regression checks that benchmark prompts omit `policyStatus` and that wrong model decisions remain scoreable while production validation stays strict |
| `npm run check` | TypeScript check passed |
| `npm run build` | Production frontend build passed |
| `docker compose up -d --build` | App image rebuilt; app, Ollama and Mailpit started; app healthy |
| `GET /api/health`, `GET /api/model/status` | App healthy with synthetic/test-delivery labels; configured qwen3:1.7b reachable and installed |
| Playwright Chromium smoke at 1440×1000 | HTTP 200, benchmark heading and parity explanation rendered, no page errors |
| App container rebuild | One-repeat run `1dd67924-1b3f-47b0-aecf-cdf9f365c66a` remained in SQLite history |
| Corrected three-repeat core run | `e3dd1e49-5d40-4cd2-b03c-9dfce4654804`; all 54 attempts completed. Tool agent 12/18; single-pass and LangGraph 3/15 each. See [evaluation results](../evaluation-results.md). |
| qwen3:4b local diagnostic | Single-pass passed 3/4 evidence cases; validator blocked an unauthorized-acceptance output. Tool-agent diagnostic timed out at 180 seconds. Not a full run. |

The previous reported 18/18 tool-agent benchmark score is invalid for comparison because the agent follow-up prompt received deterministic `policyStatus` labels that the baselines did not. Corrected comparison is v3. Two Windows Modern Standby intervals occurred during the three-repeat run; paired timings showed no positive client-minus-Ollama request gap above 10 seconds, but keep the host-standby limitation attached to wall-time claims.

## Historical readiness defect corrections, 2026-11-05

- Corrected pending/stale uploaded acceptance priority; rejected and dismissed follow-ups require explicit review/reinvestigation. Added independent approval/send and scope regressions.
- Supported model citations now bind to matching current policy-selected sources and reviewed passages, with substantive billing/delivery/written-acceptance coverage. Contextual human-reviewed delivery/acceptance wording and original PDF whitespace are preserved.
- Added shared validateCurrentInvestigation for draft editing, approval, send, PDF route and direct PDF renderer. Invalid historical raw/displayed citations require reinvestigation; valid model and rules cases remain usable.
- Fixed draft Send to test inbox overflow via wrapped action/control rows. Isolated project Git metadata; nothing staged, committed, pushed or deployed externally. No new dependency or paid service.
- Executed npm test: 124/124 pass; npm run check and npm run build pass. npm audit (including dev dependencies): zero reported vulnerabilities. docker compose config --quiet and docker compose build app pass. Final image activated, runtime hashes matched, app/Mailpit healthy, model installed/reachable.
- Executed focused EVAL_IDS=25-pending-withdrawal,26-reviewed-withdrawal,27-dismissed-followup,28-heading-citation with EVAL_DIR=test-results/readiness-fixes/focused; then continued the same frozen-code results with node scripts/evaluate-model.mjs --resume in test-results/readiness-fixes/model. Initial full coverage: 27/28 valid expected-status responses, one Windows-standby subprocess timeout, zero unsafe outcomes. EVAL_IDS=04-wrong-case in sleep-retry passed 1/1 in 38.056 seconds. All 28 scenarios have a passing result after retry; completed-call p95 57.58 seconds, maximum 63.25. Original failure and power events preserved. These are policy-assisted status results, not general semantic accuracy.
- Executed node test-results/readiness-fixes/rehearsal/run.mjs on final source: three isolated in-memory Chrome rounds, two branches each, six exact synthetic Mailpit emails, duplicate/stale guards, six PDF downloads, keyboard/Escape checks and no page errors. An earlier pre-shared-guard rehearsal is separately archived; it is not counted as extra final rounds.
- Executed node test-results/readiness-fixes/layout/verify.mjs on rebuilt deployed CSS without injection: 20 theme/sidebar/viewport combinations pass. No overflow, escaped controls, removed pilot UI or page/console errors.
- Executed node test-results/readiness-fixes/uploaded-case.mjs after final activation: actual historical FEATURES case approval/send/pack each 409; fresh Ollama job passed in 76.048 seconds with exact billing-condition quote and browser reload recovery; current approval/send/PDF revalidation passed. One unique synthetic test message reached Mailpit despite repeat send. PDF text and all three rendered pages checked. Restart preserved the entire corrected case, approval and delivery; post-restart PDF and idempotent-send checks passed.
- Test artifacts: ignored test-results/readiness-fixes/{automated-tests.log,consolidated-model.json,source-manifest.json,runtime-hashes.json,restart.json,power-events.json}, plus focused/, model/, sleep-retry/, layout/, rehearsal/ and uploaded/. Temporary idle-sleep prevention released; permanent power settings unchanged.
- Original objective/features preserved. Product remains a local, declared-identity, human-reviewed, policy-assisted prototype with test SMTP. Actual customer utility, independent semantic reliability, willingness to pay and payment/DSO impact remain unvalidated. Current recommendation: GO for the scoped synthetic local demo; no production sign-off.

The entries below are historical checks and retain their original scope/results. They do not supersede this entry or restore removed product features.

## Remove optional pilot tracking, 2026-11-05

Removed PilotPanel component/UI, outcome-reporting endpoint and PDF outcome/baseline fields at the user's request. Removed new collection of first-investigation/first-approval timestamps and unused panel styles. Historical persisted records/events remain intact. All 102 tests passed, including PDF omission and endpoint removal coverage; TypeScript and Docker build passed. Chrome verified no pilot panel, HTTP 404 on the obsolete endpoint, visible draft review and no horizontal overflow at 1440px/390px. Invoice investigation, source review and approval guards remain covered by the existing tests.

## Optional pilot-panel layout fix, 2026-11-05

Chrome reproduced a 213.8px vertical overlap between the sticky draft card and expanded pilot panel at 1917px width. Grouped evidence/draft into their own grid row to contain sticky positioning above pilot tracking. Labeled pilot tracking optional and retained its collapsed default. TypeScript and Docker build passed. Chrome verified no overlap or horizontal overflow at 1917, 1440, 1024, 850 and 390px in both themes, plus a clickable pilot form control. Evidence: ignored test-results/features/pilot-layout-report.json and pilot-overlap-fixed.png. No backend, model, approval or send behavior changed.

## PDF-only evidence pack, 2026-11-05

- Replaced HTML/JSON product downloads with a single PDF download, application/pdf and a .pdf attachment filename. The pack route rejects html/json formats. Current-investigation and case-scope guards remain in force.
- Added pinned runtime dependency PDFKit 0.20.2 (MIT). PDF rendering embeds Liberation Sans regular/bold from the existing pdfjs-dist standard_fonts directory; redistribution/license notices remain in the dependency packages. No paid service, browser container or external PDF renderer is required.
- PDF includes findings and exact citations, contract review, current correspondence/approval, complete source records including original email headers, source/version/page links, manually reported outcome/baseline and event history. Email header CRLF is normalized only for PDF line layout; stored source text is unchanged. Original PDF links require local Ledgerly.
- All 102 automated tests, TypeScript and Docker production build passed. Export tests verify PDF bytes, MIME type, stale-investigation rejection, multi-page selectable text, accented names and untrusted markup rendered as text. The focused export suite passed again after the CRLF/page-layout adjustment. npm installation reported zero vulnerabilities.
- Actual Chrome click downloaded ledgerly-FEATURES-1793860312321.pdf. Final PDF contained three pages; all pages were rendered and visually inspected and their selectable text checked with existing PyMuPDF. The first browser verification used a response-event waiter that did not fire for a download; the corrected verification waits for the download event and independently checks the endpoint MIME type.
- Evidence: ignored test-results/features/pdf-download-report.json, evidence-pack.pdf, pdf-final-page-1.png through pdf-final-page-3.png and pdf-tests.log. No model rerun or email send was required for this export change.

## Six pilot features verified 2026-11-05

- Scoped uploads: .txt and plain-text .eml, retained original headers/text, declared sender/timestamp/provenance and explicit source review. Acceptance review checks the configured approver; delivery review never grants acceptance. New evidence/reviews clear findings, investigation and approval.
- Contract source viewer suggests exact text for human confirmation. Drafts list actual blockers and next actions; reconciliation drafts use readable source titles and excerpts.
- Current-investigation HTML and JSON packs download successfully, escape untrusted text, include source/version/review/activity references and original PDF links. HTML can be printed to PDF. Downloads are not automatically sent as email attachments.
- Persisted asynchronous jobs return 202 and expose case-scoped progress. Unit/API tests cover duplicate starts, write locks, failure/retry, job scope and interrupted-job recovery after restart. Chrome verified page reload and explicit retry during actual inference.
- Pilot baselines/outcomes are explicitly self-reported, with reference requirements for reported blocker clearance/payment. These reports do not change findings, approve/send mail or execute payments. Model time and first-investigation-to-first-approval time are separate.
- Corrected imported record origin labels; users choose synthetic or consented records. The workspace summary keeps different currencies separate.
- All 102 automated tests passed (test-results/features/automated-tests.log), TypeScript passed, and the Docker production build passed.
- Actual Chrome workflow: synthetic invoice FEATURES-1793860312321, contract PDF review via suggested text, delivery text upload/review, plain-text acceptance email upload/review, Ollama job with page reload, all three supported findings, manual baseline/outcome entry, exact approval and verified Mailpit delivery, HTML/JSON download. Actual qwen3:1.7b processing: 69.495 seconds. Desktop, dark theme and 390px overflow checks passed with no page errors. A final post-build check verified persisted case/pack access and expanded forms at 390px.
- The first actual three-source run exposed malformed JSON: the model emitted raw PDF newlines within a quote string (599 tokens, done_reason stop), not token truncation. Generated quote choices now use exact single-line source snippets bounded to 400 characters; original multiline source text and reviewed clauses remain unchanged. Source/authority/type/citation validators remain strict. Added an explicit output-budget error for genuinely truncated responses. The failure and successful retry are retained in the report.
- Evidence artifacts: ignored test-results/features/report.json, truncation-diagnostic.jsonl, evidence-pack.html, desktop.png, dark.png and mobile.png. This targeted run does not establish production accuracy, authenticated sender identity, a new aggregate model score or recovered cash. Plain-text email only; encoded/multipart bodies, attachments and OCR remain unsupported.

## Approval and contract-review gates, 2026-11-05

- Reproduced the audit failures in an isolated in-memory app, with a mocked transport and no real email. The corrected failed-investigation approval returns HTTP 409 and invokes no transport. Unrelated text labeled contract now returns unknown.
- Editing drafts, approval and sending require completed current investigation metadata bound to evidence, reviewed contract and case context, exactly three distinct valid findings, and current policy agreement. Approval and sending independently enforce internal routing for unresolved findings. Existing approvals/investigations without this completion metadata require reinvestigation.
- Contract uploads remain unknown until a local reviewer confirms an exact clause for the supported delivery-plus-written-acceptance billing condition. Eligibility word checks do not independently grant support. Source and context hashes invalidate stale reviews. Reviewer identity is a local declaration, not authenticated identity or automated legal interpretation. Synthetic fixture constructors include explicitly labeled fixture-author reviews; existing saved cases are not silently reviewed or reset.
- Added 13 gate regression cases plus an assertion on the actual model-failure endpoint. Updated agent fixtures to include explicit contract reviews; changed scenario expectations to unknown where a previously reviewed source or bound case context changes. The old 24-case model score is historical and has not been rerun against these changed expectations.
- All 91 automated tests, TypeScript and Docker production build passed.
- Chrome exercised the original uploaded pilot: unreviewed contract unknown; exact clause confirmed through the source dialog; prior findings/approval cleared; actual qwen3:1.7b investigation returned contract supported and delivery/acceptance missing. Model elapsed time was 158.178 seconds.
- The initial browser response waiter timed out at 240 seconds despite successful persisted server completion. Reopened the case and independently checked the saved local-model result, PDF page citation, reviewed internal draft, approval and Mailpit delivery. This recovered workflow passed; it is not evidence of an uninterrupted browser inference flow. Slow CPU inference/browser response handling remains a limitation.
- Evidence: ignored test-results/pilot/safety-fix-report.json, including the initial timeout and recovered outcome; citation.png and sent.png. Test email went only to project-manager@agency.example.

## Imported PDF source-reference repair 2026-11-05

- Captured the failing qwen3:1.7b output: it used the document UUID instead of the actual page source ID ending in "-p1", and collapsed PDF newlines inside its quote. Existing validation correctly rejected both mismatches.
- Final-response JSON Schema now restricts source IDs to sources actually read within this case. Quote choices come from exact exposed source text, lines and sentences, retaining PDF whitespace. There is no fuzzy source lookup, guessed ID repair, invented quote, automatic status override, or silent demo fallback. The existing independent validator still checks case, source type, exact quote, authority and policy agreement.
- Output choices cover the existing exposed-text window (up to 6,000 characters per source), rather than only the beginning of a page. Step-limit errors now include the last validation failure.
- Added four regression tests for imported UUID/page IDs, empty evidence, forged transport output, and multiline PDF quotations including evidence late in a page. Two schema tests failed before the change; all 78 automated tests passed after the final change. TypeScript and Docker production build passed.
- Reused synthetic invoice PILOT-1793853218334 and its original uploaded contract in Chrome. Actual Ollama inference took 80.012 seconds and returned contract supported, delivery missing, acceptance missing. Opened the original PDF page citation, reviewed and approved the exact internal draft, and verified one Mailpit email to project-manager@agency.example. Case is now sent (test delivery); invoice is not paid and no client was contacted.
- Browser report: ignored test-results/pilot/post-fix-report.json; original failure report and captured pre-fix model output remain available there. This is a targeted synthetic pilot, not a new full model benchmark or production/customer validation.
- Final rebuilt-code read-only verification on the same imported case also passed in 77.892 seconds with all three expected findings and exact source citations. This check preserved the sent case and did not send another email; Mailpit contained exactly one matching message. Evidence: ignored test-results/pilot/final-model-verification.json.

## Uploaded-record pilot observed 2026-11-05

User requested the full browser import, actual-model investigation, approval and Mailpit flow. Used newly created **synthetic** records, not customer records: invoice PILOT-1793853218334, PHP 45,000, and a one-page selectable-text contract requiring delivery and authorized written acceptance. Delivery and acceptance records were deliberately absent.

- Chrome UI CSV and contract PDF imports succeeded. Source viewer text and original PDF page 1 link were checked.
- Actual qwen3:1.7b investigation failed after 79.767 seconds with HTTP 422: step limit reached without valid findings. No rules-demo fallback was used.
- A separate diagnostic invocation on the same imported case reproduced the failure. Evidence read succeeded; findings submission failed validation: "Model referenced an unread or unrelated source." The two-step budget then ended. This establishes an invalid-source-reference failure; the exact model-generated identifier was not captured.
- No draft was approved or sent; no matching Mailpit message was found. Approval and delivery portions of this pilot remain unexecuted.
- Evidence artifacts are in ignored test-results/pilot: invoice.csv, contract.pdf, imported-source.png, report.json, and model-diagnostic.log. Earlier successful fixture benchmark results do not establish correctness on this imported packet.
- Next: correct the model's source-reference handling while preserving unread/unrelated-source rejection, then repeat this same packet through approval and test delivery.

Date: 2026-11-04. Distinguish implemented code, mocked integration tests, observed runtime and unverified behavior.

## Commands executed successfully

| Command | Result |
| --- | --- |
| npm.cmd install | Installed free dependencies and lockfile |
| npm.cmd test | 73 tests passed, including agent integration, imports, GitHub safety, recovery and policy boundaries |
| npm.cmd run check | TypeScript check passed |
| npm.cmd run build | Production frontend build passed |
| npm.cmd audit | Zero reported vulnerabilities after updates |
| docker compose config --quiet | Compose resolves |
| docker compose up -d mailpit | Actual test SMTP/inbox running |
| docker compose build app | Multi-stage image built successfully with non-root runtime |
| docker compose up -d --no-deps app | App serves built UI and API at loopback port 3000 |
| docker compose restart app | Sent status and exact approval persisted in named-volume SQLite |
| node scripts/evaluate-model.mjs | Full post-fix 24/24 qwen3:1.7b CPU cases completed: 24/24 exact raw responses, 24/24 correct workflow branches, 0 errors, 0 unsafe ready-to-send outcomes, p95 66.2s |
| BASE_URL=http://127.0.0.1:3000 node scripts/rehearse.mjs | Three consecutive container browser rounds passed, including imports, PDF page citation, live/cached GitHub demo, Mailpit idempotency and 390px overflow check |
| node scripts/rehearse-recovery.mjs | Workspace backup and restore passed with imported PDF bytes, page references and sent state preserved |

Dependency audit remediation: @fastify/static 10.1.8, nodemailer 10.3.1, glob 14.0.3 override. Build and tests were rerun. Review/remove the override when upstream resolves its dependency range.

## Observed behavior

- Local API smoke investigated a fixture, approved exact correspondence, delivered via real Mailpit SMTP and confirmed inbox availability.
- Container API smoke repeated approved delivery, restarted app, confirmed persisted sent status/approval, and returned 200 for idempotent resend without another SMTP action.
- Parent browser validation covered happy-path approval/send, missing-acceptance internal routing and mobile viewport without horizontal overflow. Screenshots/test outputs reside in ignored test-results where retained.
- Synthetic seed punctuation corrected to ASCII separators to avoid Windows encoding corruption.

## Boundaries and failures

- Docker CLI 28.5.1 / Compose v2.40.3-desktop.1 installed. Engine was initially unavailable, later started and Linux container runtime verified.
- Ollama full image pull was intentionally stopped because system disk space was limited; no selected model downloaded or actual inference benchmark completed.
- Agent tool-loop tests use mock model/network responses. They do not prove model quality.
- The live GitHub check is a controlled public read-only PR demonstration paired with synthetic billing data; it is not customer mapping or a write integration.
- PDF imports require selectable text; scanned documents and OCR remain out of scope. Imported approver fields are declarations, not identity verification.
- The model quality gate is not passed: 18/24 workflow branches were correct and six cases failed with controlled errors. The zero unsafe ready-to-send result demonstrates fail-closed behavior, not accuracy.
- Node 24.8 emits an experimental node:sqlite warning; all current runtime tests passed with that warning.
- No git commit, push, production deployment or paid service was performed.

## Documentation foundation

Kiban scaffold previously reported all eight core files present with zero conflicts. Documentation setup checked 43 relative links with zero broken links; rerun after further doc changes.

## Historical benchmark UI smoke (2026-11-06)

| Command/check | Result |
| --- | --- |
| `npm test` | 128 tests passed, including benchmark catalog, isolated run persistence, bounded request validation, and interrupted-run recovery |
| `npm run check` | TypeScript check passed |
| `npm run build` | Vite production frontend build passed |
| `GET /api/benchmarks/tasks` via Fastify injection and Docker app | Six core scenarios, two named strategies, and 28 expanded evaluation cases returned; no invoice case changed |
| `docker compose build app` and `docker compose up -d --no-deps app` | Image rebuilt and app healthy; Ollama and Mailpit services/volumes left running |
| Chromium UI smoke at 390px | Benchmark heading and six task rows rendered, no page errors or horizontal overflow; navigation to the retained Resolution desk and back worked |
| One actual local core suite, run `d55f25f0-396b-4080-a7a1-171532599010` | Ledgerly tool agent: 6/6 expected behaviors, including injected-tool recovery and outage detection. Single-pass baseline: 1/5 scored behaviors; four normal cases failed structured finding validation, with one 815.221-second outlier. Full details in [evaluation results](../evaluation-results.md). |
| Chromium reopened completed run | Two comparison cards, the saved six-task run, and 12 attempt traces rendered; displayed Ledgerly score matched the persisted API result; no page errors |

This was the initial v1 smoke run. It is historical and is not the current accuracy result.

## Historical benchmark contract v2 (2026-11-06; unfair comparison)

The v2 implementation was believed to correct parity, but the later 2026-11-10 audit found that `policyStatus` still appeared in the tool-agent follow-up prompt. Its reported 18/18 versus 3/15 score is withdrawn; retain these checks only as historical build and UI evidence.

| Command/check | Result |
| --- | --- |
| `npm run check` | Passed after shared input/schema, timing, and LangGraph adapter changes |
| `npm test` | 131/131 passed, including initial-context status-label withholding, structured schema constraints, timing callback, and LangGraph graph execution/validation. It did not catch the follow-up prompt leak. |
| `npm run build` | Vite production build passed |
| `docker compose build app` | Multi-stage Docker image built; npm audit reported zero vulnerabilities |
| `docker compose up -d app` and `GET /api/health` | Updated app healthy with Ollama qwen3:1.7b and test SMTP services available |
| `GET /api/benchmarks/tasks` | Three adapters, six core cases, and 28 expanded cases returned |
| Chromium benchmark UI smoke at 1280px | Three comparison cards and saved per-task repeat breakdown rendered; no page errors or horizontal overflow |
| Saved live run `1433804f-fa86-4d80-8915-ffa6c236e2d8` | Three repeats, 54/54 attempts completed. The tool-agent 18/18 and baseline 3/15 scores are invalid for comparison due to the policy-status leak. |
| Per-request telemetry | Client duration and Ollama total/load/prompt/generation times persisted in every model request trace; Windows Kernel-Power standby events correlate with the two largest client/model gaps |

Repeat mean completion times excluding the no-model outage and N/A rows were, for repeats 1/2/3: Ledgerly 72.0/62.3/55.0 s; direct single-pass 84.0/62.6/33.0 s; LangGraph.js 32.7/31.7/28.2 s. Standard deviation across those three repeat means: 7.0/20.9/2.0 s respectively. Direct single-pass includes standby-inflated attempts of 217.2 s and 130.2 s; corresponding Ollama request totals were 47.0 s and 41.0 s. See [evaluation results](../evaluation-results.md) for task-level results and the scoring limitations.

The historical v2 result validates that repeats, traces and one independent LangGraph adapter executed, but its candidate accuracy comparison was unfair. See the 2026-11-10 fair v3 results at the top of this file. Local API/service cost remained $0; the LangGraph.js package is MIT-licensed.
