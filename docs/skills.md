# Skill routing and development handoffs

Kian remains the sole human builder and decision owner. These are development advisory roles, not separate product agents or additional staffing. The application still uses one bounded orchestrator.

## Routing

| Skill | Owns task guidance | Required handoff evidence |
| --- | --- | --- |
| Kiban | Instructions, documentation, state and verification | Canonical links, actual commands, outstanding TODOs |
| Nexus | Scope, architecture tradeoffs, delivery cuts | Decision, cost, risk, review trigger |
| Prism | Customer research, positioning, pricing and claims | Sources vs hypotheses, validation metric |
| Shinra | Model benchmark, retrieval, tool loop, AI evaluation | Model/configuration, hardware, failures, held-out results |
| Takumi | API/data contracts, backend, Docker, persistence | Working vertical slice, restart behavior, integration evidence |
| Bi | Case workspace, evidence navigation, approval UX | Keyboard flow, responsive states, accessibility checks |
| Gahaku | Visual identity, icons, palette and presentation assets | License/provenance, editable assets, handoff to Bi |

## How to use

AGENTS.md routes relevant tasks here. Load the matching installed SKILL.md before specialist work. The session's available-skills catalog is the authoritative location map; user-supplied skill content also applies. Do not hardcode a developer's home-directory paths or copy whole skill files into this project.

If a named skill is unavailable, report it and use these portable responsibilities for ordinary work where possible; do not claim the skill was loaded. This document routes existing skills; it neither installs them nor registers custom skill packages.

Use only the roles needed for the current task. Additional agent delegation must follow session authorization. Skill examples are not automatic approval for paid services, new frameworks, infrastructure, or broad rewrites. Project constraints and user instructions take priority.

## Working order

1. Kiban: read state and define the task and acceptance criteria.
2. Shinra + Takumi: agree tool/API contracts; benchmark before committing to the model.
3. Takumi: implement a Docker-based end-to-end skeleton, persistent records and approved test delivery.
4. Bi: make the working flow accessible and clear, including missing/conflicting evidence and stale approval states.
5. Gahaku: supply restrained visual assets after the workflow is established; Bi implements the shared tokens.
6. Shinra/Takumi/Bi: provide relevant model, integration and browser checks; Kiban records evidence and next task.
7. Nexus/Prism: review scope or commercial claims when those change.

## Review of the existing setup

- Shinra lens: retain one bounded agent, baseline comparison and held-out cases; benchmark CPU/GPU latency, do not fine-tune first.
- Takumi lens: keep a modular monolith and SQLite; add Compose early, with health/readiness checks and persistence verification.
- Bi lens: prioritize invoice context, evidence checklist, source viewer and approval panel. Status must use text/icons as well as color; keyboard access and focus handling are acceptance criteria.
- Gahaku lens: communicate calm, legibility and traceable evidence. Use editable SVG and a coherent licensed icon system; avoid paid image services and decorative work before the functional demo.

These are planning recommendations, not independent runtime sign-offs. Visual palette, branding and UI have not been designed or approved yet.
