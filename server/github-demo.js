import { event, contractReviewFor } from './domain.js';
import { fetchGithubEvidence } from './agent.js';

export const DEMO_GITHUB = Object.freeze({ owner: 'gdg-pup-webdev', repo: 'gdg-pup-photoboothV2', number: 3 });
export const DEMO_CASE_ID = 'demo-photostrip';
const repository = `${DEMO_GITHUB.owner}/${DEMO_GITHUB.repo}`;
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/** Synthetic business scenario linked to a real public development artifact. */
export function createGithubDemoCase() {
  const milestone = 'M1 - Photostrip email delivery';
  const common = { caseId: DEMO_CASE_ID, milestone, mode: 'synthetic', version: 'photostrip-demo-v1', page: 1, url: null };
  const evidence = [
    { ...common, id: 'photostrip-contract', type: 'contract', title: 'Synthetic demo contract - Email delivery milestone', author: 'Synthetic contract parties', excerpt: 'Milestone M1 covers photostrip email delivery via Resend. Billing requires the delivery record and written acceptance by client@photostrip.example.' },
    { ...common, id: 'photostrip-acceptance', type: 'acceptance', title: 'Synthetic demo client acceptance', author: 'client@photostrip.example', accepted: true, excerpt: 'I accept milestone M1, photostrip email delivery via Resend, for billing in this synthetic demonstration.' },
  ].map(e => ({ ...e, text: e.excerpt }));
  const c = { id: DEMO_CASE_ID, customer: 'Photostrip demo client (synthetic)', invoiceNumber: 'DEMO-GITHUB-001', amount: 250000, amountMinor: 250000, currency: 'USD', project: 'Photobooth email delivery - synthetic billing scenario', milestone,
    objection: 'Please provide the email-delivery development record and client sign-off for this synthetic invoice.', authorizedApprovers: ['client@photostrip.example'], recipient: 'ap@photostrip.example', synthetic: true,
    disclosure: 'Invoice, contract and acceptance are synthetic. The linked public GitHub PR is real. No customer billing or acceptance is inferred from GitHub.', githubDemo: true, githubMode: 'live', status: 'new', evidence, findings: [], draft: null, approval: null, investigation: null, sendState: null, events: [event('created', 'Synthetic billing case linked to a real public GitHub development artifact')] };
  c.contractReview=contractReviewFor(c,evidence[0],evidence[0].text,'Synthetic fixture author');
  return c;
}

function assertMapping(c) {
  if (c.id !== DEMO_CASE_ID || c.githubDemo !== true) throw error('GitHub demo is only enabled for the controlled synthetic case.', 403);
  const configured = c.evidence.find(e => e.type === 'delivery' && e.github);
  if (configured && (configured.github.owner !== DEMO_GITHUB.owner || configured.github.repo !== DEMO_GITHUB.repo || configured.github.number !== DEMO_GITHUB.number)) throw error('GitHub mapping does not match the controlled demo allowlist.', 403);
}

/** Returns a fresh case copy. The caller persists it only after success. */
export async function refreshCaseGithub(c, options = {}) {
  assertMapping(c);
  const mode = options.mode ?? c.githubMode ?? 'live';
  if (!['live', 'cached'].includes(mode)) throw error('Choose live or cached source mode.');
  let source;
  if (mode === 'cached') {
    const snapshot = c.githubSnapshot;
    if (!snapshot || !snapshot.fetchedAt || !snapshot.version || snapshot.mode !== 'live' || snapshot.caseId !== c.id || snapshot.milestone !== c.milestone
      || snapshot.github?.owner !== DEMO_GITHUB.owner || snapshot.github?.repo !== DEMO_GITHUB.repo || snapshot.github?.number !== DEMO_GITHUB.number) throw error('No verified live snapshot exists for explicit offline replay.', 409);
    source = { ...snapshot, mode: 'cached', replayedAt: new Date().toISOString(), title: `${snapshot.title} - cached snapshot` };
  } else {
    const original = { id: 'photostrip-github-delivery', caseId: c.id, milestone: c.milestone, github: { ...DEMO_GITHUB }, author: 'GitHub public API', type: 'delivery' };
    try {
      source = await fetchGithubEvidence(original, { ...options, allowedRepositories: [repository] });
    } catch (cause) {
      throw error(`Live GitHub lookup failed: ${cause.message}. Choose cached replay explicitly if a snapshot is available.`, 503);
    }
  }
  source.accepted = false;
  source.type = 'delivery';
  const next = { ...c, githubMode: mode, evidence: [...c.evidence.filter(e => e.id !== source.id), source], findings: [], draft: null, approval: null, investigation: null, status: 'new', events: [...c.events, event('github_refreshed', mode === 'live' ? `Read public PR ${repository}#${DEMO_GITHUB.number} live; this is delivery evidence only` : `Explicit cached replay of snapshot fetched ${source.fetchedAt}; no live lookup claimed`)] };
  if (mode === 'live') next.githubSnapshot = { ...source };
  return next;
}

export function registerGithubDemoRoutes(app, { store, get, locks, fail }) {
  const schema = { type: 'object', properties: { mode: { type: 'string', enum: ['live', 'cached'] } }, additionalProperties: false };
  const preValidation = async req => { if (req.body && Object.keys(req.body).some(key => key !== 'mode')) throw fail(400, 'Only source mode may be supplied; the repository mapping is fixed.'); };
  const ensureIdle = c => { if (locks.has(c.id) || c.sendState === 'sending') throw fail(409, 'A case action is already running.'); };
  app.post('/api/demo/github', { preValidation, schema: { body: schema } }, async req => {
    const existing = store.get(DEMO_CASE_ID);
    if (existing) ensureIdle(existing);
    locks.add(DEMO_CASE_ID);
    try {
      const c = existing ?? createGithubDemoCase();
      const refreshed = await refreshCaseGithub(c, { mode: req.body?.mode ?? 'live' });
      store.put(refreshed);
      return refreshed;
    } finally { locks.delete(DEMO_CASE_ID); }
  });
  app.post('/api/cases/:id/github/refresh', { preValidation, schema: { body: schema } }, async req => {
    const c = get(req.params.id); ensureIdle(c); locks.add(c.id);
    try { const next = await refreshCaseGithub(c, { mode: req.body?.mode ?? 'live' }); store.put(next); return next; }
    finally { locks.delete(c.id); }
  });
}
