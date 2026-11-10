# Engineering standards

Proposed conventions; no implementation yet.

- One local service and bounded agent before adding infrastructure.
- TypeScript proposed for frontend/backend; pin actual versions after selection.
- Validate model/tool JSON schemas and case ownership server-side.
- Store money as integer minor units with currency; calculate in code.
- Separate evidence extraction, interpretation, policy and execution.
- Enforce [evidence policy](../evidence-policy.md) outside the model.
- Keep secrets server-side and untracked; use synthetic fixtures.
- Store local private artifacts outside tracked fixtures.
- Test policy boundaries, stale approvals, retries and real browser flows.
- Avoid tests that merely mirror implementation.
- Record dependency/model licenses; do not activate paid billing.
- Document measured behavior and limitations after each vertical slice.

