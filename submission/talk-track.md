# Ledgerly demo talk track (about 3 minutes)

## Slide 1 — 0:00–0:12
Ledgerly is a local agent benchmarking platform. It compares how agents behave on identical work, not just the quality of a model’s final answer.

## Slide 2 — 0:12–0:28
Agents may reason in steps, call tools, encounter failures, or be influenced by misleading content. A useful benchmark needs shared inputs, repeat runs, and traces people can inspect.

## Slide 3 — 0:28–0:45
We built three strategies around the same local model: our bounded tool agent, a direct single-pass baseline, and a LangGraph.js adapter. Every candidate gets the same facts, evidence, rules, citation options, and output contract.

## Slide 4 — 0:45–1:00
The core suite includes authorized and missing evidence, unauthorized acceptance, a misleading instruction, an injected tool failure, and an unavailable model. All cases are synthetic.

## Slide 5 — 1:00–1:25
The fair common-task comparison is four evidence cases over three repeats each. The tool agent passed six of twelve attempts, or fifty percent. Both single-pass candidates passed zero of twelve. That is a narrow result on this task set, not a general reliability claim.

## Slide 6 — 1:25–1:45
The tool agent recovered from the injected tool failure three out of three times. Every candidate correctly surfaced the unavailable model three out of three times. The tool agent failed the unauthorized-approver and misleading-instruction cases every time. The benchmark makes these limits visible.

## Slide 7 — 1:45–2:00
For each attempt, Ledgerly records outcomes, steps, calls, tokens, timing, estimated API fees, and trace events. Inference was local through Ollama, with no paid API fees.

## Slide 8 — 2:00–2:15
Here is the comparison workspace. The cards expose full-run totals, while the equal-denominator evidence comparison is reported separately because adapters have different supported-task counts.

## Slide 9 — 2:15–2:30
The three repeats produced identical task outcomes. Timing is from one local CPU setup; the host had standby events, and the adapters have different supported-task denominators. These numbers are descriptive, not a speed ranking or guarantee.

## Slide 10 — 2:30–2:45
Ledgerly demonstrates a repeatable, inspectable benchmark with failure scenarios. It does not prove high agent accuracy, production readiness, or broad framework compatibility. Only one independent LangGraph adapter is implemented.

## Slide 11 — 2:45–3:00
Our next steps are to improve evidence reasoning, add another independent adapter, and expand evaluation before making stronger claims. The value today is a fair test bench that shows exactly where agents still fail.

## Run details
Corrected run: e3dd1e49-5d40-4cd2-b03c-9dfce4654804. Contract v3. qwen3:1.7b, Ollama 0.12.6, CPU, temperature 0, 4096 context, 1000 output-token cap. Three repeats; 54 total adapter attempts. Two Modern Standby intervals occurred during the run; wall-clock timing carries that limitation. Synthetic tasks only.

## Presentation note
The orbit, pipeline, and result bars are animated GIFs embedded in the PowerPoint. They animate in slide-show mode; a static preview may show only their first frame.
