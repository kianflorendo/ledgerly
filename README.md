# Ledgerly

A local, framework-neutral AI agent benchmarking prototype. It compares a tool-using and single-pass agent strategy on identical synthetic invoice-evidence tasks, with repeated runs, controlled failure cases, metrics, and inspectable traces. The invoice Resolution desk remains available as the benchmark domain demo.

## Start locally with Docker

Start Docker Desktop, then run from this folder:

```powershell
docker compose up -d --build
```

- Workspace: http://localhost:3000
- Mailpit test inbox: http://localhost:8025

If the model is not installed yet:

```powershell
docker compose exec ollama ollama pull qwen3:1.7b
```

The application, model and inbox run locally without paid API keys. Model download needs internet and disk space. Rules demonstration is explicitly labeled and performs no AI inference; model failures never silently switch to it.

Stop while preserving saved cases, documents and models:

```powershell
docker compose stop
```

## Run an agent benchmark

Open **Agent benchmark** in the left navigation. Select the core reliability suite or expanded 28-case suite, choose 1–3 sequential repeats, and start the run. The UI reports progress, candidate success/error rates, model requests, tool calls, token counts, latency, and per-attempt traces. The core suite includes misleading evidence instructions, a one-time tool failure, and an unavailable-model scenario. These runs use synthetic tasks only and never send correspondence.

Both initial candidates use the same configured local Ollama model and shared application validator. This compares two strategies; it is not a model leaderboard or a claim that external agent frameworks are already integrated. Local API fees are $0; electricity and hardware are excluded.

## Try the invoice resolution desk

1. Expand **Import invoices and contract evidence**. Choose synthetic or consented records, then import the displayed invoice CSV format. Test email recipients must use .example addresses.
2. Select the invoice and upload its text-based contract PDF (up to 30 pages / 5 MB).
3. Open the contract under **Sources**. Choose suggested exact text or copy the billing clause, review it and confirm the supported condition: delivery plus written client acceptance. A file upload alone never verifies its terms. Other contract conditions stay under internal review.
4. Upload delivery or acceptance evidence using .txt or plain-text .eml files (100 KB file / 30,000-character body limit). Headers and original text are retained. HTML/multipart messages, encoded bodies and email attachments are unsupported; export decoded plain text first.
5. Open each uploaded record under **Sources** and explicitly review the exact quotation, milestone and decision. Acceptance requires a sender matching the configured approver; declared headers and reviewer names do not verify identity. Delivery review never proves acceptance.
6. Choose **Local model · Ollama** and investigate. The saved job shows progress. Reloading and selecting the same case resumes status polling; a server restart marks interrupted jobs failed and permits an explicit retry.
7. Review findings and exact correspondence. Unresolved evidence permits internal review only. Approve the exact message, then send it to Mailpit. A failed, incomplete or stale investigation cannot approve or send.
8. Download the current evidence pack directly as a PDF with selectable text. Original PDF links require the local workspace to be running. Downloads are not automatically attached to email.

Adding or reviewing evidence invalidates previous findings and approval. Review records bind to source content and case context. Unreviewed new acceptance records block reliance on older acceptance until explicitly reviewed. Existing saved cases without current completion metadata or adequate reviewed model citations require reinvestigation before editing, approval, sending or PDF export.

## Development and checks

Requires Node.js 24.8+ and npm. With dependencies installed:

```powershell
npm.cmd run dev:server
```

Run the frontend in a second terminal:

```powershell
npm.cmd run dev
```

For the production frontend and local server:

```powershell
npm.cmd run build
npm.cmd start
```

Checks:

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run build
```

## Boundaries

This is a local single-user prototype with test-only SMTP, not a publicly hosted production billing system. The bounded Ollama workflow uses application policy statuses and validates model-selected citations; it does not independently authorize financial decisions. CPU inference can be slow. Current quote generation selects exact single-line source snippets; original multiline sources and reviewed clauses are preserved.

Scanned PDFs/OCR, production authentication, mailbox synchronization, accounting writeback and payment execution remain outside this release. GitHub is a controlled allowlisted read-only demonstration. Synthetic test results do not establish production accuracy or recovered cash.

See [current state](docs/state.md), [architecture](docs/ARCHITECTURE.md), [evidence policy](docs/evidence-policy.md), [verification](docs/standards/verification.md), and the [pilot feature plan](docs/plans/pilot-features.md).
