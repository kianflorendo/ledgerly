# Implemented architecture and remaining work

Local modular application: built React/TypeScript/Vite frontend served by Fastify; SQLite via Node's built-in node:sqlite persists case records as JSON. Node 24.8 emits an experimental SQLite warning; this is documented runtime evidence, not a claim of database API stability.

## Services and data

The pilot additions live in server/pilot.js: case-scoped source uploads/reviews, text-based PDF pack downloads. Plain-text email parsing retains the original headers; sender and reviewer identity remain unverified declarations.

The browser starts persisted investigation jobs with POST /api/cases/:id/investigations (202), then polls the case-scoped job endpoint. The existing synchronous endpoint remains for compatibility. A job stores progress and final state in the case JSON; stage callbacks do not alter the completed-investigation fingerprint. One lock per case protects evidence/review/send mutations. Startup marks interrupted jobs failed; it never resumes an unknown computation or silently substitutes a demo result. Retry is explicit.


`server/app.js` owns API policy and action execution; `server/domain.js` owns invoice fixtures and deterministic evidence rules; `server/store.js` owns persistence; `server/agent.js` owns bounded Ollama tools and strict model-output validation. `server/benchmark.js` registers candidate runners against a common input (`task`, model/config, injected faults and metric/trace callbacks) and normalized output (findings, metrics, tool calls and trace), applies shared scoring, and persists benchmark results separately in SQLite. Candidate-specific framework output must be normalized at its adapter boundary. `client/BenchmarkWorkspace.tsx` renders benchmark runs and traces; `client/` also retains the invoice Resolution desk. Docker packages app, Ollama and Mailpit with persistent app/model volumes. See [Docker](docker.md).

Benchmark jobs execute sequentially to protect a local CPU model. They operate on fixture inputs only and never call case action or SMTP endpoints. An interrupted run is marked failed at startup and must be started again. Run results retain compact traces but not full source documents or prompts. The initial two candidates share Ollama and the same validator, which measures strategy differences rather than model quality. A third-party framework adapter has not yet been implemented.

Cases include invoice/project/milestone identifiers, authorized-approver mapping, evidence records, findings, draft, approval and events. Monetary amounts use integer minor units. Fixture acceptance is structured data, not inferred from a GitHub merge.

## Investigation modes

Demo executes deterministic fixture policy and labels that no AI inference occurred. Ollama mode executes the bounded model tool loop and validates findings/citations. Backend policy independently evaluates required acceptance before drafting or authorizing an external test message. Model outage does not silently fall back to demo success.

GitHub requests require both an allowlisted owner/repository and PR mapping on the selected case. GitHub delivery can never establish acceptance. The controlled live demo reads a public PR and labels it separately from the synthetic invoice and contract; cached replay is explicit and preserves its source timestamp.

## Approval and delivery

Draft editing, approval and sending require a completed investigation snapshot tied to the current evidence, case context and contract review, plus exactly three distinct validated findings. The approval and send endpoints each independently enforce internal routing when evidence remains unresolved. Historic investigations without completion metadata must be rerun.

Approval covers exact draft, attachments (currently empty), evidence and findings. Changes invalidate it. Missing acceptance restricts the action to the configured internal-review mailbox. Test recipients must end in .example. SMTP action records pending delivery before sending; repeat requests after success return the existing result. Uncertain failures stop automatic retries to avoid duplicate delivery, requiring inbox inspection/manual recovery. A crash while sending likewise leaves an unresolved pending action.

The UI and API are local development/demo tools without production authentication. Loopback port bindings and cross-origin write rejection support this deployment boundary; do not expose publicly as a production application.

## Imports and recovery

Uploaded contracts are unreviewed evidence, not verified billing requirements. The source viewer provides a local review form for an exact clause requiring delivery and written client acceptance. The review endpoint binds the exact quote, source hash, case context, declared reviewer and timestamp; changing evidence or context invalidates the review. Eligibility checks and file labels cannot independently grant supported status. Other billing conditions stay unknown for internal review. This explicit human interpretation is not automated semantic verification or authenticated identity.

CSV invoice imports validate required fields, currency and duplicate identifiers before one atomic write. Text PDF contract imports persist the original document and attach page-level evidence to the selected case; scanned PDFs are rejected because OCR is outside the zero-cost demo scope. Backup manifests hash the SQLite snapshot and referenced documents; restore verifies those hashes before replacing a stopped application's database.

## Remaining work

Verified model reliability, authority provenance beyond fixture configuration, production auth/multi-tenancy and pilot workflows remain outstanding. No vector database, distributed services or fine-tuning is required for this scope.
