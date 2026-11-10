# Solo delivery plan

Owner: Kian. Nexus and Prism are advisers, not extra staffing.
Decision: 2026-11-04. Review after feasibility, then before release freeze.
This supersedes the earlier three-person seven-day assumption.

## Effort
Estimate: 42-64 focused hours plus 8-12 hours contingency, approximately 8-13 days at six focused hours/day. Deadline and available hours remain TODO; this is not a calendar commitment.
All stages target $0 additional service spend.

Docker update: add a provisional 3-6 hours for container integration and recovery checks, giving 45-70 implementation hours plus the existing 8-12 contingency hours. Incorporate [Docker](../docker.md) in the first executable slice; do not defer container validation until submission. Use [skill routing](../skills.md) for task handoffs without assuming more human capacity.

| Stage | Hours | Deliverable | Gate |
| --- | --- | --- | --- |
| Feasibility | 3-5 | Event requirements, hardware/model benchmark, two fixtures | Delivery distinguished from acceptance; latency recorded |
| Evidence | 6-9 | Case records, text PDF/email sources, GitHub reader | Correct case boundaries and source navigation |
| Agent slice | 8-12 | Real bounded tool loop and two branches | Correct review-ready vs missing-acceptance outcome |
| Review/action UI | 8-12 | Workspace, citations, approval, Mailpit | Full flow reaches test inbox |
| Evaluation/repair | 8-12 | Negative cases and baseline comparison | Critical release gates pass |
| Submission | 9-14 | Setup/reset, deck, video, rehearsals | Reproducible clean start and three full passes |

## Sequence
1. Confirm deadline, rules, laptop capacity and hosted-app requirement.
2. Benchmark local inference before visual polish; record failures and model configuration.
3. Build a plain end-to-end flow with one valid and one missing-acceptance case.
4. Add persistent evidence and source navigation; integrate live GitHub reads.
5. Implement approvals, stale-approval protection, test delivery and event history.
6. Add the evaluation suite and compare with manual/simple-answer baselines.
7. Polish only the case workspace and presentation-critical interactions.
8. Freeze, rehearse, record, and package. Reserve contingency for failures.

## Scope cuts
Cut OCR, extra connectors, dashboards, multi-user auth, vector DB, cloud deployment, accounting integrations and multilingual support first.
Do not cut case isolation, actual tool execution, exception handling, source citations, approval or truthful labels.
If Mailpit cannot be completed, downloadable approved email is an explicitly reduced deliverable; never describe it as sent.

## Risks and tripwires
- Weak local model: narrow model responsibilities and context; re-evaluate before UI work.
- Required public app: resolve hosting feasibility before architecture freeze.
- Network outage: cached sources visibly labeled and recorded backup.
- Insufficient time: reduce scope, retain evaluation and presentation time.
- Weak customer evidence: consult [research](../research.md), not a larger feature list.

Acceptance: [evaluation](../evaluation.md). Submission: [demo](../demo.md).
Current handoff: the local implementation exists. Use [current state](../state.md) and [readiness review](../readiness-review.md) for present verification, remaining limitations and submission work; the sequence above records the original delivery plan.

