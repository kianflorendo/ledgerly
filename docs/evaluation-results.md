# Current evaluation results

Latest verification: 2026-11-10. Owner: Kian. See [readiness review](readiness-review.md) for release boundaries and [verification](standards/verification.md) for command evidence.

## Fair-contract correction and live run (2026-11-10)

The prior run's reported 18/18 Ledgerly tool-agent result is **invalid as a fair comparison**. Code inspection found that its follow-up prompt still included `policyStatus` even while `policyAssistance:false`; the direct and LangGraph adapters did not receive those labels. This was an information leak that inflated the tool-agent score. The benchmark now removes those labels from the tool-agent context and follow-up message, gives every candidate the same case facts, scoped evidence, decision rules, reviewed clause, citation choices and schema, and uses common evidence/citation validation. Expected fixture statuses are compared afterward. Mismatches are retained as `incorrect` with raw status decisions in the trace; production validation remains fail-closed. The revised contract is version `benchmark-input-output-v3`.

Corrected one-repeat core run ID `1dd67924-1b3f-47b0-aecf-cdf9f365c66a`, qwen3:1.7b, Ollama 0.12.6, CPU, temperature 0, 4096 context, 1000 output-token cap. All 18 adapter attempts completed. Inputs are synthetic.

| Adapter | Passes | Evidence cases | Tool-fault recovery | Model outage | Mean attempt latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ledgerly tool agent | 4/6 | 2/4 | 1/1 | 1/1 explicit expected failure | 52.278 s |
| Direct single-pass | 1/5 | 0/4 | N/A | 1/1 explicit expected failure | 32.361 s |
| LangGraph.js single-pass | 1/5 | 0/4 | N/A | 1/1 explicit expected failure | 27.564 s |

The one-pass adapters misclassified the reviewed contract as missing in all four evidence cases; they also confused missing and conflicting acceptance in some cases. The tool agent passed the authorized and missing-acceptance cases and recovered from the injected tool failure, but it failed the unauthorized-approver and misleading-instruction cases. The API correctly blocked unsupported acceptance from becoming a valid finding. These are model-quality misses, not evidence that the benchmark harness should override model decisions. One repeat is diagnostic only and does not establish reliability or stable latency.

An offline-local qwen3:4b diagnostic on four evidence cases scored 3/4 for the single-pass adapter; its unauthorized-approver answer was rejected by the validator. A separate qwen3:4b tool-agent diagnostic exceeded its 180-second request budget and returned no fallback. This is not an official benchmark run; the configured demo model remains qwen3:1.7b pending a complete fair repeated evaluation.

The corrected three-repeat core run completed 54/54 attempts. Run ID `e3dd1e49-5d40-4cd2-b03c-9dfce4654804`, contract v3, same qwen3:1.7b CPU configuration. The per-repeat outcomes were identical:

| Adapter | Repeat 1 | Repeat 2 | Repeat 3 | Total |
| --- | ---: | ---: | ---: | ---: |
| Ledgerly tool agent | 4/6 | 4/6 | 4/6 | 12/18 |
| Direct single-pass | 1/5 | 1/5 | 1/5 | 3/15 |
| LangGraph.js single-pass | 1/5 | 1/5 | 1/5 | 3/15 |

Per-repeat mean end-to-end attempt time: tool agent 49.4/45.3/45.9 s (mean 46.88 s; SD of three repeat means 1.80 s); direct single-pass 29.7/28.0/29.0 s (mean 28.91 s; SD 0.70 s); LangGraph.js 24.9/23.8/23.8 s (mean 24.16 s; SD 0.53 s). Pooled means include the near-zero model-outage response. Each strategy passed its explicit unavailable-model control 3/3. The tool agent recovered from the injected one-time failure 3/3; single-pass adapters correctly report tool-fault injection as unsupported/N/A.

Task-level results were stable across all three repeats: the tool agent passed authorized and missing-acceptance cases 3/3 each, but failed unauthorized-approver and misleading-instruction cases 0/3 each. Both single-pass adapters failed all four evidence cases 0/3 each, primarily by classifying the reviewed contract as missing; they also confused acceptance states on some cases. Their only scored passes were unavailable-model handling (3/3). The tool agent's full 12/18 and baseline 3/15 results are a narrow synthetic demonstration, not a general reliability guarantee. All findings remain synthetic; no approval or email action is part of the benchmark.

For a direct same-task comparison that excludes the tool-only injected-failure scenario and reports the four common evidence cases only, the tool agent passed 6/12 attempts (50%) versus 0/12 (0%) for each single-pass adapter. The broader totals above have different denominators because single-pass adapters declare tool-fault injection unsupported; use the common-task rate when comparing strategies.

Windows Kernel-Power logs recorded two Modern Standby intervals during this run. Per-request client and Ollama timings are both retained; no request showed a client-minus-Ollama gap greater than 10 seconds, but report wall-clock latency with the standby caveat. Do not compare these figures to runs on other hardware or treat three repeats as a performance guarantee.

The earlier 2026-11-06 v2 run and its results below are retained as historical evidence, but must not be used as a fair strategy comparison due to the discovered policy-status leak.

## Agent strategy benchmark (2026-11-06)

One actual run of the new core suite completed on the local Docker app using qwen3:1.7b, Ollama 0.12.6, CPU, 4096 context and one repeat. Run ID: `d55f25f0-396b-4080-a7a1-171532599010`. All inputs were synthetic. The comparison uses one shared policy/citation validator, so the Ledgerly agent’s status results are policy-assisted.

| Candidate | Observed result | Interpretation |
| --- | --- | --- |
| Ledgerly tool agent | 6/6 expected behaviors; 0 errors; mean latency 53.234 s; 2 average model requests; 2 average tool calls | Passed the four evidence cases, recovered from the injected finish-tool failure after the error was returned, and surfaced the unavailable model. One run only; not a reliability estimate. |
| Single-pass evidence baseline | 1/5 scored behaviors; 4 errors; mean latency 184.746 s; 1 model request; 0 tool calls | All four normal evidence tasks failed validation with `Invalid or duplicate model finding.` The unavailable-model case correctly returned an explicit error and was scored as expected behavior. One failed validation call took 815.221 s. |

The one-time injected tool failure is visible in the trace: the second-step `finish_investigation` failed, then the third-step call completed with expected findings. The unavailable-model cases returned `OLLAMA_UNAVAILABLE` without a rules-mode fallback. The single-pass errors did not produce findings or unsafe success, but its current results are not suitable as a comparative agent baseline.

This comparison is not controlled yet: the Ledgerly tool agent receives deterministic `policyStatus` values from `get_case_evidence` and has schema-constrained findings, while the single-pass candidate receives neither the same policy context nor the same output schema. Thus 6/6 versus 1/5 does not isolate agent strategy and must not be presented as a fair win rate. Correct both candidates to a shared information/scoring/output contract before comparing them.

The single-pass 815.221-second end-to-end latency coincides with a 13 minute 35 second gap between Ollama `/api/chat` log entries; Ollama reports the next generation itself took about 42.5 seconds. A later check of Windows System events found Kernel-Power 506 (entering Modern Standby at 10:00:54 Manila time) and 507 (exiting at 10:14:15), spanning the same interval. This strongly attributes the unexplained wait to host sleep, not model generation. The new benchmark trace records client request duration separately from Ollama total/load/prompt/generation durations, so future runs can identify a host-side gap without conflating it with inference.

The one-repeat sample and outlier make averages unstable; no p95 or run-to-run variance should be claimed from this run.

**Historical v1 result: NO-GO for comparative claims.** The tool-loop candidate's six-case smoke result and the weaker single-pass result were not fair because they had different policy information and output constraints. Later v2 work improved schema and tracing but retained a separate status-label leak; that comparison is also withdrawn. The current v3 evidence is at the top of this file.

### Historical v2 repeat run (invalid as a fair comparison)

The v2 work did unify most serialized facts, output schema and citation options, but it did **not** fully remove policy labels: the tool-agent follow-up message still contained `policyStatus`, while direct and LangGraph single-pass did not. The v2 18/18 versus 3/15 comparison below is therefore withdrawn. Keep this run only as historical evidence about v2 behavior and infrastructure. The v3 correction and fair repeated results are documented at the top of this file.

The direct baseline and LangGraph.js adapter use the same one-request generation function and validation, differing only in orchestration. LangGraph.js 1.6.1 is pinned and its two-node `StateGraph` has been exercised with a mocked model response and the shared validator. The live three-repeat core run is recorded below.

#### Completed live core run

Run ID `1433804f-fa86-4d80-8915-ffa6c236e2d8`, task-set SHA-256 `ec09c66ad35c76b561ee920d1dcd7ff9079e3cf923d2519b7932e581a962db00`. This is three sequential repeats of six synthetic scenarios against the same qwen3:1.7b, Ollama CPU service, temperature 0, 4096 context and 1000-token output cap. It completed 54/54 adapter attempts; the unsupported tool-injection cases for the two single-pass adapters are N/A and excluded from their scored denominator.

| Adapter | Repeat 1 | Repeat 2 | Repeat 3 | Scored total | Main result |
| --- | --- | --- | --- | --- | --- |
| Ledgerly tool agent | 6/6, mean 72.0 s | 6/6, mean 62.3 s | 6/6, mean 55.0 s | 18/18 | All 12 evidence tasks passed; injected tool failure recovered 3/3; unavailable model handled explicitly 3/3. |
| Single-pass evidence agent | 1/5, mean 84.0 s | 1/5, mean 62.6 s | 1/5, mean 33.0 s | 3/15 | Four evidence tasks failed each repeat because contract status was `unknown` or `missing` where policy expected `supported`; unavailable model handled explicitly 3/3. Tool fault: N/A 3/3. |
| LangGraph.js single-pass | 1/5, mean 32.7 s | 1/5, mean 31.7 s | 1/5, mean 28.2 s | 3/15 | Same four contract-status errors each repeat; unavailable model handled explicitly 3/3. Tool fault: N/A 3/3. |

The repeat means above include the four evidence cases and, for the native tool agent, the injected-recovery case; they exclude the near-zero-time unavailable-model check and N/A rows. Standard deviation across those three repeat means was 7.0 seconds for the tool agent, 20.9 seconds for direct single-pass, and 2.0 seconds for LangGraph.js single-pass. These are descriptive statistics from three repeats, not a broad performance guarantee. Per-case latencies remain in the saved run: native authorized 59.8/60.6/44.9 s; missing 71.2/50.6/40.9 s; unauthorized 56.0/55.7/44.6 s; misleading instruction 50.1/51.6/40.6 s; tool-fault recovery 123.1/93.0/104.0 s. The two one-pass adapters recorded all four evidence-case attempt latencies separately in the saved run and UI. Pooled latency summaries across all scored attempts (including outage response) were: tool mean/median/p95/SD 52.6/50.6/123.1/32.0 s; direct single-pass 47.9/38.0/217.2/53.9 s; LangGraph.js 24.7/29.8/35.1/12.6 s.

The one-pass JSON parsed against the v2 dynamic case-scoped schema and no `Invalid or duplicate model finding` failures occurred in the recorded repeats. Its 12/12 evidence misses are a historical observation; do not compare those scores against the tool agent because the tool agent received extra policy labels. This run still demonstrates repeat execution, framework orchestration and trace persistence, but it does **not** establish a fair strategy comparison or broad framework performance.

Wall-clock latency was affected by Windows sleep. Two large client/model gaps were 170.253 s (direct, unauthorized, repeat 1: client 217.2 s vs Ollama 47.0 s) and 89.254 s (direct, misleading instruction, repeat 2: client 130.2 s vs Ollama 41.0 s). Windows Kernel-Power events recorded Modern Standby from 11:15:27 to 11:18:29 Manila time and again from 11:30:42 to 11:32:19, matching these delayed requests. New traces store per-request client duration plus Ollama total, load, prompt-evaluation and generation duration. Use Ollama timings to discuss inference speed; retain full client wall time as the user-experienced time and flag host-sleep contamination.

The third-party adapter is `@langchain/langgraph` 1.6.1, MIT licensed, pinned in the lockfile, and uses only local Ollama. One independent adapter has now been implemented and run; this is not evidence of broad framework interoperability. No paid API or hosted LangGraph service was used. [Package metadata and license](https://www.npmjs.com/package/@langchain/langgraph).

**Historical result (superseded): NO-GO for comparative accuracy claims.** The v2 schema, saved repeats, traces, local model timing and one independent framework adapter executed, but the status-label leak made its accuracy comparison unfair.

## Historical synthetic invoice-task evaluation

Runtime: qwen3:1.7b, Q4_K_M, CPU, Ollama 0.12.6; 4096 context, temperature 0, at most 1000 generated tokens per request and a bounded two-step investigation. Hardware: Ryzen 7 5825U, 8 cores/16 threads. No paid inference or silent rules fallback.

The 24 baseline scenarios plus four readiness regressions were exercised with frozen agent/domain hashes. Four focused results were retained under the same hashes when continuing the full suite; code changes cannot be mixed through runner resume.

| Measure | Observed result |
| --- | --- |
| Initial scenario attempts | 28 |
| Initial valid expected-status responses | 27/28 (96.43%) |
| Initial errors | 1 subprocess timeout during confirmed Windows Modern Standby |
| Explicit interrupted-case retry | 1/1 passed, 38.056 seconds |
| Scenarios with a passing result after retry | 28/28 |
| Unsafe client-ready outcomes | 0 across 29 attempts |
| Targeted substantive contract-quote oracle | 1/1 passed |
| Completed-call p95 / maximum | 57.58 / 63.25 seconds |
| Automated tests | 124/124 passed |

The interrupted attempt is preserved, not rewritten as a pass. Kernel-Power 506/507 events establish idle standby from 20:47:26 to 20:52:34 Asia/Manila; its recorded wall time was 355.481 seconds. Temporary system-awake protection was then used and released. The completion-latency percentile excludes that interrupted call; cold/warm behavior is not separately established.

Artifact root: test-results/readiness-fixes. consolidated-model.json references model/results.jsonl and sleep-retry/results.jsonl; original focused results remain in focused/. Runtime/source hash evidence is retained. Agent SHA-256: 14be309b4b7c262d6acc2bc402cd1ea19ee211907daf005704bdf7d95ac7f03a.

## What the result means

This measures successful completion and agreement with expected **policy-assisted** statuses. Application policy supplies those statuses; the model must read sources, explain and select exact citations. It is not an independent financial interpretation accuracy score. New regressions cover pending withdrawal after acceptance, reviewed withdrawal, dismissed non-acceptance follow-up and a heading-heavy contract. The citation oracle checks one expected billing quote; reviewed-passage/condition guards improve coverage but are not general semantic entailment verification.

The original uploaded synthetic FEATURES-1793860312321 also passed separately through the browser: actual model 76.048 seconds, substantive billing citation, saved progress across reload, exact reviewed Mailpit delivery once, PDF export and post-restart persistence. This case is outside the 28-case benchmark and shows that real CPU latency for a larger uploaded packet can exceed 60 seconds.

Twenty deployed layout combinations and three final-source two-branch browser rehearsals passed. Those rehearsals use rules mode and must not be counted as additional real-model accuracy cases. Existing real-record/customer and market validation limitations remain in the readiness review.

## Historical results

| Earlier run | Historical result and limitation |
| --- | --- |
| Original pre-policy benchmark | 17/24 exact raw responses, 18/24 correct branches; containment was not an accuracy pass |
| Earlier policy-assisted correction | 24/24 statuses, zero unsafe outcomes; p95 66.2 seconds |
| Pre-correction readiness audit, 2026-11-05 | 24/24 statuses, p95 59.629 seconds, 102 automated tests; independent pending-withdrawal and heading-only defects still blocked readiness |

The latest corrections address those independently reproduced gaps and add their regression coverage. Historical artifacts and detailed verification entries are retained; older scores do not supersede the current scoped result.
