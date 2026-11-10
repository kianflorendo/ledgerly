# Ledgerly Agent Benchmark - video narration

The 114-second cut uses an offline Microsoft Zira voice generated with Windows SAPI. The video also includes a recorded browser walkthrough of the locally running website. It shows the saved synthetic three-repeat benchmark; no new evaluation run was started for recording.

## Narration

Ledgerly is a local benchmark for AI agents. It measures the complete run, not only the final answer.

Agent behavior includes tool calls, multi-step decisions, and failures. A fair comparison needs the same task, clear scoring, and repeat runs.

Ledgerly compares a bounded tool agent, a direct single-pass baseline, and a LangGraph adapter. Each receives identical synthetic case facts, scoped evidence, rules, citations, and output format.

The core suite tests authorized evidence, missing acceptance, wrong approvers, misleading source instructions, a failing tool, and an unavailable model.

This corrected three-repeat run uses qwen3 one point seven b through local Ollama. Across the four common evidence cases, the tool agent passed six of twelve attempts. Direct single-pass and LangGraph each passed zero of twelve.

The tool agent recovered from the injected tool failure in all three repeats. Every strategy surfaced the model outage each time. But the tool agent failed the wrong-approver and misleading-instruction cases on every repeat. It has not met our task-accuracy target.

Now let's inspect Ledgerly in the browser. This is the saved three-repeat result; we are not starting another benchmark. The cards show each agent's metrics. Expand per-task outcomes, then open an execution trace to inspect its steps, calls, evidence checks, and timing. Finally, switch to the invoice-resolution desk to see a synthetic case and the source-evidence review flow.

The system captures task outcomes, execution steps, tool calls, prompt and output tokens, completion time, estimated API fees, and detailed traces. Paid API costs are zero; hardware and electricity are excluded.

These are synthetic tasks on one local model. We have not established production reliability, customer outcomes, recovered cash, or broad framework support.

Ledgerly makes agent behavior visible, repeatable, and comparable. Next: improve evidence reasoning and add another independent adapter.
