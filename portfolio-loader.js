/* Loading screen: BIOS-style POST log, then CRT power-off reveal. Gates OmFX.boot via OmLoader.ready. */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches, seen = false, res;
  try { seen = sessionStorage.getItem('om_loaded') === '1'; } catch (e) {}
  var ready = new Promise(function (r) { res = r; });
  window.OmLoader = { ready: ready };
  if (RM || seen) { res(); return; }

  var LINES = [
    ['om-bios v2.6', ''],
    ['mem check', 'ok'],
    ['mount ~/om-kekan', 'ok'],
    ['load eval-harness', 'ok'],
    ['start rag-agent --guardrails', 'ok'],
    ['index vector store', 'ok']
  ];
  var el = document.createElement('div');
  el.id = 'loader';
  el.setAttribute('aria-hidden', 'true');
  var log = document.createElement('pre');
  log.id = 'loader-log';
  var hint = document.createElement('div');
  hint.id = 'loader-hint';
  hint.textContent = 'click or press any key to skip';
  el.appendChild(log); el.appendChild(hint);
  document.documentElement.appendChild(el);

  var finished = false, timers = [];
  function add(l) {
    var row = document.createElement('div');
    var name = document.createElement('span');
    name.textContent = l[0] + (l[1] ? ' ' + '.'.repeat(Math.max(2, 34 - l[0].length)) + ' ' : '');
    row.appendChild(name);
    if (l[1]) { var ok = document.createElement('span'); ok.className = 'ok'; ok.textContent = '[ ' + l[1] + ' ]'; row.appendChild(ok); }
    log.appendChild(row);
  }
  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', finish);
    el.removeEventListener('pointerdown', finish);
    try { sessionStorage.setItem('om_loaded', '1'); } catch (e) {}
    el.classList.add('off');
    setTimeout(res, 220);              /* boot starts while the screen collapses */
    setTimeout(function () { el.remove(); }, 700);
  }
  LINES.forEach(function (l, i) { timers.push(setTimeout(function () { add(l); }, 160 + i * 170)); });
  var end = 160 + LINES.length * 170 + 320;
  var last = document.createElement('div');
  timers.push(setTimeout(function () { last.innerHTML = '&gt; ready<span class="cursor"></span>'; log.appendChild(last); }, end - 200));
  timers.push(setTimeout(finish, end + 350));
  document.addEventListener('keydown', finish);
  el.addEventListener('pointerdown', finish);
  setTimeout(finish, 5000);            /* failsafe */
})();
