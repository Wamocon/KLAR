const BASE = 'https://klar-app.vercel.app';
const KEY = 'klar_5aa6a6c6_5b7db84964d56d1d07afb2c1386ea57c37cc5c5fd729d546';
let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log('  PASS:', name) };
const no = (name, d) => { fail++; console.log('  FAIL:', name, d || '') };

async function fetchSSE(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  const events = t.split('\n').filter(l => l.startsWith('data:')).map(l => {
    try { return JSON.parse(l.slice(6)); } catch { return null; }
  }).filter(Boolean);
  return { status: r.status, events };
}

async function main() {
  // 1. WEB UI PAGES
  console.log('\n=== 1. Web UI Pages ===');
  const pages = ['/', '/about', '/contact', '/privacy', '/terms', '/imprint', '/verify', '/tools', '/benchmark', '/auth/login', '/auth/signup', '/settings', '/dashboard', '/history'];
  for (const p of pages) {
    const r = await fetch(BASE + '/en' + p, { redirect: 'follow' });
    r.status === 200 ? ok('GET /en' + p) : no('GET /en' + p, 'status=' + r.status);
  }
  for (const p of ['/', '/about', '/verify']) {
    const r = await fetch(BASE + '/de' + p, { redirect: 'follow' });
    r.status === 200 ? ok('GET /de' + p) : no('GET /de' + p, 'status=' + r.status);
  }

  // 2. AUTH GATES
  console.log('\n=== 2. Auth Gates ===');
  // Account requires auth
  const rAuth = await fetch(BASE + '/api/account');
  [401, 403].includes(rAuth.status) ? ok('AUTH /api/account') : no('AUTH /api/account', 'status=' + rAuth.status);
  // Usage returns guest info without auth (correct)
  const rUsage = await fetch(BASE + '/api/usage');
  rUsage.status === 200 ? ok('Usage accessible (guest)') : no('Usage', 'status=' + rUsage.status);
  // Export requires auth
  const rExport = await fetch(BASE + '/api/export?format=json');
  [400, 401, 403].includes(rExport.status) ? ok('Export gate') : no('Export', 'status=' + rExport.status);

  // 3. VERIFY SSE + DB SAVE
  console.log('\n=== 3. Verify SSE + Save ===');
  const { status: s3, events: ev3 } = await fetchSSE(BASE + '/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({ text: 'Berlin is the capital of Germany. The Berlin Wall fell in November 1989.', language: 'en', mode: 'text', analyses: ['fact-check'] })
  });
  const done3 = ev3.find(e => e.type === 'completed');
  const err3 = ev3.find(e => e.type === 'error');
  if (done3 && done3.verification?.id) {
    ok('Pipeline completed trust=' + done3.verification.trust_score + ' claims=' + done3.claims?.length);
    // Test GET saved report
    const r3g = await fetch(BASE + '/api/verify?id=' + done3.verification.id, { headers: { 'Authorization': 'Bearer ' + KEY } });
    r3g.status === 200 ? ok('GET saved report') : no('GET saved report', 'status=' + r3g.status);
    if (r3g.status === 200) {
      const d3g = await r3g.json();
      ok('Report data: trust=' + d3g.verification?.trust_score + ' claims=' + d3g.claims?.length);
    }
  } else {
    no('Pipeline', err3 ? JSON.stringify(err3) : 'no completed event, types=' + ev3.map(e => e.type).join(','));
  }

  // 4. AI DETECTION
  console.log('\n=== 4. AI Detection ===');
  const { events: ev4 } = await fetchSSE(BASE + '/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({ text: 'The utilization of advanced methodologies in the implementation of sophisticated algorithmic processes necessitates comprehensive understanding of underlying paradigms and frameworks.', language: 'en', mode: 'text', analyses: ['ai-detection'] })
  });
  const ai4 = ev4.find(e => e.type === 'ai_detection');
  const done4 = ev4.find(e => e.type === 'completed');
  if (ai4?.result && typeof ai4.result.overallScore === 'number') ok('AI detection score=' + ai4.result.overallScore + ' verdict=' + ai4.result.verdict);
  else no('AI detection', 'missing data');
  if (done4?.verification?.id) ok('AI detection saved');
  else no('AI detection save', ev4.find(e => e.type === 'error')?.message || 'no completed');

  // 5. EXTENSION SCAN
  console.log('\n=== 5. Extension Scan ===');
  const r5 = await fetch(BASE + '/api/extension/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({ text: 'The Earth orbits the Sun. Water boils at 100 degrees Celsius at sea level.', language: 'en' })
  });
  if (r5.status === 200) {
    const d5 = await r5.json();
    d5.trust_score === 100 ? ok('Extension scan trust=' + d5.trust_score + ' claims=' + d5.total_claims) : no('Extension scan', 'trust=' + d5.trust_score);
  } else no('Extension scan', 'status=' + r5.status);

  // 5b. Extension scan with false claim
  const r5b = await fetch(BASE + '/api/extension/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({ text: 'The capital of France is Berlin. The Eiffel Tower is in London.', language: 'en' })
  });
  if (r5b.status === 200) {
    const d5b = await r5b.json();
    d5b.trust_score < 50 ? ok('False claims scored low trust=' + d5b.trust_score) : no('False claims scored too high', 'trust=' + d5b.trust_score);
  } else no('False claims scan', 'status=' + r5b.status);

  // 6. EDGE CASES
  console.log('\n=== 6. Edge Cases ===');
  const r6a = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY }, body: JSON.stringify({ text: 'Hi', language: 'en', mode: 'text', analyses: ['fact-check'] }) });
  r6a.status === 400 ? ok('Short text rejected') : no('Short text', 'status=' + r6a.status);

  const r6b = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY }, body: '{}' });
  r6b.status === 400 ? ok('Empty body rejected') : no('Empty body', 'status=' + r6b.status);

  const r6c = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY }, body: 'not json' });
  r6c.status === 400 ? ok('Invalid JSON rejected') : no('Invalid JSON', 'status=' + r6c.status);

  const r6d = await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer klar_fake' }, body: JSON.stringify({ text: 'test '.repeat(20), language: 'en', mode: 'text', analyses: ['fact-check'] }) });
  r6d.status === 401 ? ok('Wrong API key rejected') : no('Wrong key', 'status=' + r6d.status);

  const r6e = await fetch(BASE + '/api/extension/scan', { method: 'OPTIONS', headers: { 'Origin': 'chrome-extension://test', 'Access-Control-Request-Method': 'POST' } });
  [200, 204].includes(r6e.status) ? ok('CORS preflight') : no('CORS', 'status=' + r6e.status);

  // 7. SECURITY
  console.log('\n=== 7. Security ===');
  // XSS with factual text (fewer claims = faster, avoids timeout)
  const r7a = await fetch(BASE + '/api/extension/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({ text: 'Berlin is the capital of Germany. <script>alert(1)</script> The Berlin Wall fell in November 1989.', language: 'en' })
  });
  if (r7a.status === 200) {
    const d7 = await r7a.json();
    d7.claims?.some(c => c.text?.includes('<script>')) ? no('XSS not stripped') : ok('XSS stripped, trust=' + d7.trust_score);
  } else no('XSS test', 'status=' + r7a.status + ' (Gemini timeout)');

  const r7b = await fetch(BASE + "/api/verify?id=" + encodeURIComponent("'; DROP TABLE verifications;--"));
  r7b.status === 400 ? ok('SQL injection blocked') : no('SQL injection', 'status=' + r7b.status);

  // 8. BENCHMARK
  console.log('\n=== 8. Benchmark ===');
  const agentR = await fetch(BASE + '/api/benchmark/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA-' + Date.now(), model: 'gpt-4o', description: 'QA test' })
  });
  if (agentR.status === 201) {
    const ag = await agentR.json();
    ok('Agent registered: ' + ag.agentId);
    const examR = await fetch(BASE + '/api/benchmark/exam', { method: 'POST', headers: { 'Authorization': 'Bearer ' + ag.apiToken } });
    if (examR.status === 200) {
      const ex = await examR.json();
      ok('Exam: ' + ex.questions?.length + ' questions');
      const answers = {};
      for (const q of (ex.questions || [])) answers[q.id] = 'QA test answer';
      const subR = await fetch(BASE + '/api/benchmark/submit/' + ex.submissionId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ag.apiToken },
        body: JSON.stringify({ answers })
      });
      if (subR.status === 200) { const s = await subR.json(); ok('Score: ' + s.totalScore + '/100'); }
      else no('Submit', 'status=' + subR.status);
    } else no('Exam', 'status=' + examR.status);
    const lbR = await fetch(BASE + '/api/benchmark/leaderboard');
    lbR.status === 200 ? ok('Leaderboard') : no('Leaderboard', 'status=' + lbR.status);
  } else no('Agent', 'status=' + agentR.status);

  // 9. USAGE API
  console.log('\n=== 9. Usage API ===');
  const r9 = await fetch(BASE + '/api/usage', { headers: { 'Authorization': 'Bearer ' + KEY } });
  if (r9.status === 200) { const d9 = await r9.json(); ok('Usage: used=' + d9.used + ' limit=' + d9.limit + ' plan=' + d9.plan); }
  else no('Usage', 'status=' + r9.status);

  // SUMMARY
  console.log('\n' + '='.repeat(40));
  console.log(`PASSED: ${pass}  FAILED: ${fail}`);
  console.log('='.repeat(40));
}

main().catch(e => console.error('Fatal:', e));
