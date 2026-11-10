# Evaluation and release gates

Status: evaluation protocol, with executed results in [evaluation results](evaluation-results.md) and [verification](standards/verification.md). Owner: Kian. The agent benchmark platform uses the existing 24 baseline synthetic cases plus four readiness regressions, with expectations defined before inference, and a six-scenario quick reliability suite.

## Required scenarios
Valid authorized acceptance; missing acceptance; unauthorized approver; conflicting evidence; wrong customer; wrong project; wrong invoice; stale contract; partial acceptance; wrong milestone; unreadable scan; prompt injection; missing GitHub artifact; GitHub timeout; rate limit; nonexistent citation; mismatched excerpt; changed evidence after approval; edited recipient/body after approval; duplicate-send retry.
Keep a separate set of unseen variants to reduce fixture overfitting.

The readiness regressions cover a new unreviewed withdrawal after prior acceptance, reviewed withdrawal, explicitly dismissed follow-up, and a heading-heavy contract with an exact expected substantive billing quote. The model status benchmark is policy-assisted: status agreement does not prove independent model interpretation. Its targeted citation oracle checks the expected billing quote; it does not establish general semantic accuracy.

## Baselines and measurements
The current in-app comparison runs the Ledgerly bounded tool agent, direct single-pass adapter and LangGraph.js adapter against the same serialized task facts, case-scoped evidence, authority facts, decision rules, output schema, model and generation settings. The shared validator checks shape, scope and citation integrity; expected fixture outcomes score the model's returned statuses separately. A well-formed but incorrect model decision must be recorded as `incorrect`, not hidden as a transport/validation error. Production investigation still applies strict deterministic policy and rejects mismatched status. This is a strategy comparison, not a model comparison. Record suite, task ID, expected/actual branch, success/error, adapter, model, repeat, steps/model requests, tool calls, prompt/generated tokens, latency and local API fee estimate. Trace tool errors/retries and final status without storing full prompt/source text.
For a full evaluation, compare manual investigation and agent approaches on equivalent cases and report model/quantization/runtime/context and hardware.
Measure cold and warm runs separately. Report sample count and individual timings; a small p95 is unstable.

## Proposed release gates
- Zero false acceptance decisions in critical negative cases.
- Zero accepted nonexistent or mismatched citations.
- Zero unapproved or duplicate sends.
- At least 90% correct branches across the suite.
- Warm p95 below 60 seconds on actual demo hardware is a target, not a promise.
- Source/recipient/message changes invalidate approval.
- Outages produce explicit unavailable/cached states.
- Clean startup and three complete consecutive rehearsals pass.

Passing synthetic tests does not establish production financial reliability.
Actual commands and evidence belong in [verification](standards/verification.md).

