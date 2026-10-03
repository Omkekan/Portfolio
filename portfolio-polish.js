(function () {
  'use strict';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);

  // ---------- statusline ----------
  const bar = document.createElement('div');
  bar.id = 'statusline';
  bar.innerHTML = '<span class="sl-mode" id="sl-mode">NORMAL</span><span class="sl-file" id="sl-file">index.md</span><span class="sl-enc">[utf-8]</span><span class="sl-pos" id="sl-pos">Ln 1, Col 1&nbsp;&nbsp;Top</span>';
  document.body.appendChild(bar);
  const mv = $('#main-view');
  function status() {
    const sec = document.querySelector('.content-section.active');
    const id = sec ? sec.id : 'index';
    $('#sl-file').textContent = id + '.md';
    $('#sl-mode').textContent = id === 'lab' ? 'INSERT' : 'NORMAL';
    const max = mv.scrollHeight - mv.clientHeight;
    const pct = max <= 0 ? 'All' : mv.scrollTop <= 0 ? 'Top' : mv.scrollTop >= max - 1 ? 'Bot' : Math.round(mv.scrollTop / max * 100) + '%';
    $('#sl-pos').innerHTML = 'Ln ' + (Math.floor(mv.scrollTop / 22) + 1) + ', Col 1&nbsp;&nbsp;' + pct;
  }
  mv.addEventListener('scroll', status, { passive: true });
  new MutationObserver(status).observe($('#content-area'), { attributes: true, attributeFilter: ['class'], subtree: true });
  status();

  // ---------- lab trace (event delegation: survives DOM rebuilds) ----------
  const thr = () => +document.getElementById('lab-threshold').value;
  const forced = () => document.getElementById('lab-force').checked;
  function trace(t, f) {
    const L = [['cmd', '$ run --q "what changed in v2?"'], ['', 'retrieve']];
    if (t < 40) {
      L.push(['bad', 'grade      ctx scored ' + t + '/100, below threshold'], ['bad', 'rewrite    query (attempt 1/2)']);
    } else {
      L.push(['ok', 'grade      ctx ' + t + '/100, relevant'], ['', 'generate']);
      if (f) L.push(['bad', 'verify     unsupported claim found'], ['bad', 'regenerate (attempt 1/2)']);
      else L.push(['ok', 'verify     all claims supported'], ['ok', 'answer     returned']);
    }
    return L;
  }
  const line = (c, s) => '<div class="' + c + '">' + s.replace(/</g, '&lt;') + '</div>';
  function show(lines) { const b = document.getElementById('lab-log'); if (b) b.innerHTML = lines.map((l) => line(l[0], l[1])).join(''); }
  let timer, run;
  function flow() {
    if (RM) return;
    const kids = [...document.querySelectorAll('#lab-diagram > *')];
    kids.forEach((k, i) => { setTimeout(() => k.classList.add('pulse'), i * 110); setTimeout(() => k.classList.remove('pulse'), i * 110 + 260); });
  }
  function refresh() { clearTimeout(run); show(trace(thr(), forced())); }
  document.addEventListener('input', (e) => { if (e.target.id === 'lab-threshold') { clearTimeout(timer); timer = setTimeout(() => { refresh(); flow(); }, 150); } });
  document.addEventListener('change', (e) => { if (e.target.id === 'lab-force') { refresh(); flow(); } });
  document.addEventListener('click', (e) => {
    if (e.target.id !== 'lab-run') return;
    const L = trace(thr(), forced()); let i = 0; show([]); flow();
    (function step() { show(L.slice(0, ++i)); if (i < L.length) run = setTimeout(step, RM ? 0 : 320); })();
  });
  refresh();
})();
