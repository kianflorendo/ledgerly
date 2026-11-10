# Product requirements

Decision baseline: 2026-11-06. Owner: Kian, sole builder.
Status: local agent benchmark platform with invoice-resolution tasks. Current implementation and verified behavior live in [current state](state.md). This is a hackathon prototype, not a general framework leaderboard or production validation service.

## Problem and user
AI developers lack a compact way to compare agent workflows on identical tasks, repeated runs, controlled tool/model failures, and inspectable traces. The first user is an agent developer evaluating reliability and execution tradeoffs on a local machine.

## Value proposition
Run the same synthetic evidence-reconciliation tasks against registered agent strategies, compare task success, failure modes, execution steps, tool calls, tokens, zero local API fees, and time, then inspect each attempt trace. Invoice resolution is the benchmark domain and Ledgerly’s tool-using agent is one candidate.

## Minimum complete scope
1. Framework-neutral task, adapter-result, scorer and trace contracts.
2. A core synthetic suite and an expanded 28-case evaluation suite with expected outcomes defined in advance.
3. Identical task inputs, shared application validation, configurable repeats and sequential local execution.
4. Compare task success, errors, steps/model requests, tool calls, prompt/generated tokens, latency and API fee estimate.
5. Inject a one-time tool failure, unavailable-model condition and misleading source instruction; disclose when a candidate does not support an injected condition.
6. Persist run summaries and per-attempt traces separately from invoice cases; recover interrupted runs as failed.
7. Display candidate comparison, run progress, saved runs, and detailed traces in a responsive light/dark UI.
8. Keep the invoice resolution desk available as the task-domain application demo. Benchmark runs never approve or send correspondence.

## Non-goals
Ranking model families, broad claims of external framework compatibility, production hosted benchmarking, paid inference or APIs, distributed workers, account/multi-tenant access, live customer documents, real correspondence, payment verification or model training.

## Evaluation integrity
Initial candidates share the same local Ollama model. This isolates orchestration strategy; it does not compare model quality or establish framework-independent results across third-party agent libraries. The Ledgerly agent receives deterministic policy context, so label its status comparison as policy-assisted. Cost is $0 in API fees for local Ollama and excludes hardware, electricity, and operator time. Keep tasks synthetic, results attributable to model/adapter/task/repeat, and errors visible.

## Success criteria
- Identical task inputs and a shared scorer are used for each candidate.
- Run and per-attempt metrics and traces survive page reload; completed records survive app restart.
- Tool and model failures are visible and do not silently become successful fallback results.
- No benchmark path can modify a case, approve a message, or send email.
- New dependencies and paid-service costs remain $0.
- Accuracy and reliability claims are based on actual recorded runs with sample count and limitations disclosed.
