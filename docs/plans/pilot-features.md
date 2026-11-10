# Local pilot features

Executed 2026-11-05: all six additions implemented. 102 automated tests, TypeScript and Docker build passed. The actual synthetic browser/Ollama/Mailpit workflow passed in the recorded run, including page reload, explicit retry, pack downloads and manual outcome reporting. See the canonical verification record for details and limitations.

Owner: Kian. Scope authorized 2026-11-05: implement the six suggested additions without paid services.

Sequence:
1. Case-scoped text/plain email and delivery/acceptance uploads with explicit source review and declared provenance.
2. Suggested exact contract clauses; human confirmation remains mandatory.
3. Blocker-specific correspondence listing the current unresolved requirements.
4. Downloadable text-based PDF reconciliation evidence pack (PDF-only download, per the later user request).
5. Persisted asynchronous investigation status, stage polling, reload recovery and explicit retry; preserve strict approval/send gates.
6. Per-case manual baseline and separately reported blocker/payment outcomes, with measured investigation/approval timings.

Verification: unit/API tests for parsing, source authority/scope, invalidation, HTML escaping, outcome distinctions, async completion/failure/restart; production build; actual browser case upload/review/investigation/export/outcome flow; actual Ollama async run and test SMTP delivery. Record actual evidence and limitations in the verification record.

Boundaries: local single-user app; uploaded From headers and reviewer names are declarations, not identity verification. Plain-text .eml only, no OCR or attachment parsing. Export does not send email or move payment. New evidence invalidates findings and approval; reviewing delivery never establishes acceptance.
