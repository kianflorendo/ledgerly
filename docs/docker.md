# Docker delivery decision

Decision: 2026-11-04. Owner: Kian; technical guidance: Takumi + Shinra.
Docker Compose is the local packaging baseline requested by the user. The final 2026-11-05 app image is rebuilt and activated; runtime source/assets, actual inference, test delivery, PDF export and restart persistence are verified in [verification](standards/verification.md). App and Mailpit are healthy; the selected model is installed and reachable. Later source changes require new relevant checks.

## Implemented services

| Service | Responsibility | Persistence/exposure |
| --- | --- | --- |
| app | Fastify API and built React assets in one runtime image | Named volume for SQLite and uploaded evidence; browser port bound to loopback |
| ollama | Local model inference | Separate model volume; internal Compose network, no public model port |
| mailpit | Capture approved test email | Local-only inbox UI; SMTP reachable internally |

SQLite is an embedded database, not another service. No Kubernetes, Redis, registry subscription or hosted GPU is required.

Use a multi-stage application Dockerfile with a non-root runtime user and writable data-volume permissions. Pin tested image versions/digests and dependency lockfiles. Keep model weights out of application images; provision the chosen model explicitly into its own volume.

Default CPU-capable configuration; optional NVIDIA GPU override only after hardware validation. CPU compatibility does not imply acceptable model latency. If container GPU support is unsuitable, permit a documented host-Ollama mode with a configurable backend URL; label this hybrid, not fully containerized. Validate host connectivity and firewall/bind scope without exposing Ollama publicly.

## Development and demo

The demo uses built frontend assets served by the app. An optional development override may run Vite with source mounts; preserve Linux node_modules separately from Windows host modules.
Dockerfile, compose.yaml, .dockerignore and .env.example are implemented. The app exposes local port 3000, Mailpit UI 8025 and test SMTP 1025; Ollama stays on the internal Compose network. Start/stop commands are in the root README. /api/health checks the app and /api/model/status reports model reachability and installation separately.

Define service health checks and dependency readiness. A running Ollama process is not proof that the selected model exists or can infer: readiness must check model availability separately. Report missing models clearly; no silent download during a presentation.
Use bounded retries and model timeout handling. Preserve logs without secrets/document contents. No Docker socket mounts or privileged app container.
Exclude credentials, private documents, local data, model weights, build caches and host dependencies from the build context.

## Persistence and recovery

Normal shutdown preserves volumes. Never use volume-removal operations as routine reset instructions. Fixture reset must target demo data explicitly and preserve model downloads.
Test restart recovery, persistent approvals and event history, stale approval invalidation and duplicate-send prevention. Back up SQLite consistently (backup API or stopped writer); document restoration.
Prepare images/model beforehand. Offline mode uses visibly labeled source snapshots; GitHub cannot remain live without network access.

## Cost/license boundary

Target $0 incremental service spend. Docker Desktop is free for personal use under its published terms, but is not itself a wholly open-source desktop application. Linux Docker Engine/Compose is the open-source runtime route if an entirely open-source host stack is required. Existing hardware, storage, power and download bandwidth remain prerequisites.

## Verification gates

1. Engine reachable and Linux-container mode confirmed.
2. Compose configuration resolves, application image builds and services become ready.
3. Model explicitly provisioned; actual inference and GPU use (if selected) measured.
4. Browser completes both principal cases and approved Mailpit delivery.
5. Restart retains state; reset cannot erase models or unrelated evidence.
6. Clean setup and offline fallback are rehearsed; real commands recorded in verification.

Budget an additional 3-6 focused hours for container integration and restart checks, provisional and separate from the prior estimate. Revisit if Docker/WSL/GPU setup threatens the submission buffer.

## Official references checked 2026-11-04

- [Docker Desktop terms](https://docs.docker.com/subscription-billing/desktop-license/)
- [Compose readiness](https://docs.docker.com/compose/how-tos/startup-order/)
- [Ollama Docker](https://docs.ollama.com/docker)
- [Docker Windows GPU prerequisites](https://docs.docker.com/desktop/features/gpu/): supported NVIDIA GPU and WSL 2 backend; actual hardware remains unverified.
