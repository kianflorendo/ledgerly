# Agent benchmark platform alignment

Owner: Kian. Decision: 2026-11-06. Product objective: benchmark agent workflows on identical tasks, not rank model names.

## Vertical slice

Keep invoice reconciliation as the task domain and the existing Ledgerly tool loop as one candidate. Add a small adapter contract with a single-pass evidence agent as an architectural baseline. Compare both on the same synthetic task inputs, same configured local Ollama model, repeated attempts, and one shared scoring contract. Distinguish agent strategy from model identity in the UI and result export.

Persist benchmark runs separately from invoice cases. Runs may read fixture tasks but cannot mutate cases, approve messages, send email, or attach customer evidence. Record expected/actual task success, completion/error, execution steps, tool calls, prompt/generated tokens, local API fee estimate, latency, and compact execution traces. Keep source text and full prompts out of persisted traces.

Ship a core suite with authorized acceptance, missing/unauthorized acceptance, misleading evidence instructions, a recoverable one-time tool failure, and unavailable-model injection. Retain the 28-case suite as an expanded selection. Run repeats sequentially to protect the local CPU model and identify run-to-run variance.

## Acceptance criteria

- One run API executes selected adapters against the same synthetic task cases and requested repeat count, records individual attempts, and survives page reload/server restart.
- Results compare success rate, errors, steps, tool calls, token counts, latency, and local API fee estimate by adapter. Cost is explicitly an API-fee estimate; electricity and machine ownership are not priced.
- Traces identify model requests, tool attempts, failures/retries and final findings without persisting raw source documents.
- Unavailable model is reported as an error without a Rules-demo success fallback. The tool-loop candidate encounters and records a failed tool call, then can retry within a bounded budget. Adversarial fixture text cannot alter the expected result.
- Benchmark actions never touch invoice approvals or SMTP. The existing invoice resolution desk remains available as the task-domain demo.
- All inference remains on the already installed local Ollama model; no paid API, added service, new package, trial credit, or billing activation.
- UI includes a quick core suite and a full suite with configurable repeats, preserves light/dark themes, and exposes comparison details at mobile and desktop widths.

## Limits

The two initial strategies use one Ollama model, so this compares agent orchestration strategies and not model quality or external agent frameworks. API cost is $0 for local inference; energy/carbon, throughput at scale and multi-machine testing are not estimated. Adapter contract is framework-independent; adding and evaluating an external framework remains future work.
