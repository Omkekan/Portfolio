/* portfolio-fx.js — ASCII rain on every page, boot sequence, HUD, control panel, trophies */
(function () {
    'use strict';
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (s) => document.querySelector(s);
    const SC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*/\\|{}[]()~<>-_+';
    const GL = ['|', '|', '|', '|', '/', '\\', '(', ')', '[', ']'];
    const rnd = (a) => a[(Math.random() * a.length) | 0];
    const cfg = { rain: true, density: 0.6, speed: 1, trail: 5, radius: 130, meadow: true, scanlines: true, wipe: true, scramble: true };
    const LH = 22, FS = 16;
    const isHome = () => $('#index').classList.contains('active');

    // ---------- vim-style line numbers (real lines, then ~) ----------
    const ln = $('#line-numbers'), mv = $('#main-view'), ca = $('#content-area');
    let numQueued = false;
    function numbers() {
        numQueued = false;
        const cs = getComputedStyle(ca), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
        ln.style.paddingTop = pt + 'px';
        const sec = ca.querySelector('.content-section.active');
        const real = Math.max(1, Math.round((sec ? sec.offsetHeight : ca.offsetHeight - pt - pb) / LH));
        const total = Math.ceil(Math.max(mv.clientHeight, ca.offsetHeight) / LH);
        let h = '';
        for (let i = 1; i <= total; i++) h += `<span class="line-num">${i <= real ? i : '~'}</span>`;
        ln.innerHTML = h;
    }
    const queueNumbers = () => { if (!numQueued) { numQueued = true; requestAnimationFrame(numbers); } };
    new ResizeObserver(queueNumbers).observe(ca);
    new ResizeObserver(queueNumbers).observe(mv);
    document.querySelectorAll('.content-section').forEach((sec) => new ResizeObserver(queueNumbers).observe(sec));
    numbers();
    document.addEventListener('DOMContentLoaded', numbers); // portfolio.js seeds 60 lines first; re-sync after

    // ---------- ASCII rain (global, behind every page) ----------
    const cv = $('#fx-rain'), ctx = cv.getContext('2d');
    let W = 0, H = 0, cols = 0, drops = [], cells = [], mx = -999, my = -999, running = false, raf = 0, lastT = 0;

    function spawn(d, initial) {
        d.on = Math.random() < cfg.density * 0.3;
        d.len = Math.max(2, Math.round(cfg.trail * (0.5 + Math.random())));
        d.v = 0.8 + Math.random() * 1.6;
        d.y = initial ? Math.random() * H : -Math.random() * H * 0.6;
        d.g = Math.random() < 0.8 ? '|' : rnd(GL);
    }
    function buildCluster() {
        cells = [];
        if (!isHome() || !cfg.meadow) return;
        const c = $('.hero-center').getBoundingClientRect(), r = cv.getBoundingClientRect();
        const cx = c.left - r.left + c.width / 2, cy = c.top - r.top + c.height / 2 - 30, rx = 170, ry = 150;
        for (let x = cx - rx; x < cx + rx; x += FS) {
            for (let y = cy - ry; y < cy + ry; y += FS) {
                const nx = (x - cx) / rx, ny = (y - cy) / ry;
                if (nx * nx + ny * ny > 1 || Math.random() > 0.55) continue;
                const g = rnd(GL);
                cells.push({ bx: x, by: y, x, y, vx: 0, vy: 0, g, g0: g, hot: 0 });
            }
        }
    }
    function resize() {
        const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
        W = r.width; H = r.height;
        cv.width = W * d; cv.height = H * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        cols = Math.ceil(W / FS);
        drops = Array.from({ length: cols }, () => { const o = {}; spawn(o, true); return o; });
        buildCluster();
    }
    function frame(t) {
        if (!running) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min((t - lastT) / 16.7, 3) || 1; lastT = t;
        ctx.clearRect(0, 0, W, H);
        ctx.font = `${FS}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const R = cfg.radius, base = isHome() ? 0.28 : 0.14;

        for (let i = 0; i < cols; i++) {
            const d = drops[i];
            if (!d.on) { if (Math.random() < 0.01) spawn(d, false); continue; }
            d.y += d.v * cfg.speed * dt;
            const x = i * FS + FS / 2;
            for (let k = 0; k < d.len; k++) {
                const y = d.y - k * FS;
                if (y < -FS || y > H + FS) continue;
                let px = x, py = y, g = k ? '|' : d.g, a = base * (1 - k / d.len);
                const dx = px - mx, dy = py - my, dist = Math.hypot(dx, dy);
                let hot = 0;
                if (dist < R) {
                    hot = 1 - dist / R;
                    const f = hot * hot * 28 / (dist || 1);
                    px += dx * f; py += dy * f;
                    if (Math.random() < 0.25) g = rnd(GL);
                }
                ctx.fillStyle = hot > 0.05 ? `rgba(211,181,141,${Math.min(1, a + hot * 0.9)})` : `rgba(163,182,138,${a})`;
                ctx.fillText(g, px, py);
            }
            if (d.y - d.len * FS > H) spawn(d, false);
        }

        for (const c of cells) {
            const dx = c.x - mx, dy = c.y - my, dist = Math.hypot(dx, dy);
            if (dist < R && dist > 0) {
                const f = (R - dist) * 0.05 / dist;
                c.vx += dx * f; c.vy += dy * f; c.hot = 1;
                if (Math.random() < 0.15) c.g = rnd(SC);
            }
            c.vx += (c.bx - c.x) * 0.05; c.vy += (c.by - c.y) * 0.05;
            c.vx *= 0.8; c.vy *= 0.8; c.x += c.vx; c.y += c.vy; c.hot *= 0.94;
            if (c.hot < 0.05) c.g = c.g0;
            const h = Math.min(1, c.hot * 0.8 + Math.hypot(c.vx, c.vy) * 0.15);
            ctx.fillStyle = h > 0.08 ? `rgba(211,181,141,${0.3 + h * 0.7})` : 'rgba(163,182,138,0.24)';
            ctx.fillText(c.g, c.x, c.y);
        }
    }
    function start() {
        if (RM || !cfg.rain || running) return;
        running = true; resize(); lastT = performance.now();
        raf = requestAnimationFrame(frame);
        cv.classList.add('on');
    }
    function stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }

    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => running && resize(), 150); });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    new MutationObserver(() => running && buildCluster()).observe($('#index'), { attributes: true, attributeFilter: ['class'] });
    document.documentElement.addEventListener('pointerleave', () => { mx = my = -999; });

    // ---------- keyword chips (icon + tint), like the reference ----------
    const TERMS = { Python: 'code', Linux: 'term', TensorFlow: 'node', PyTorch: 'node', 'Scikit-learn': 'node', Pandas: 'node',
        LangChain: 'bolt', LangGraph: 'bolt', RAGAS: 'bolt', Ollama: 'bolt', Qdrant: 'db', PostgreSQL: 'db', Redis: 'db',
        Flask: 'web', 'Next.js': 'web', Celery: 'web' };
    const TERM_RE = new RegExp('(^|[^\\w-])(' + Object.keys(TERMS).sort((a, b) => b.length - a.length)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])', 'g');
    (function chipify() {
        document.querySelectorAll('#content-area .type-target .keyword, #content-area .type-target .highlight').forEach((el) => {
            const ic = TERMS[el.textContent.trim()];
            if (ic) { el.classList.add('chip'); el.dataset.ic = ic; }
        });
        const w = document.createTreeWalker($('#content-area'), NodeFilter.SHOW_TEXT), nodes = [];
        while (w.nextNode()) nodes.push(w.currentNode);
        nodes.forEach((n) => {
            const p = n.parentElement;
            if (!p || !p.closest('.type-target') || p.closest('a, h1, h2, h3, .chip, .lab-controls, .boot-bar')) return;
            const txt = n.nodeValue; let m, last = 0, frag = null;
            TERM_RE.lastIndex = 0;
            while ((m = TERM_RE.exec(txt))) {
                frag = frag || document.createDocumentFragment();
                const at = m.index + m[1].length;
                frag.append(txt.slice(last, at));
                const sp = document.createElement('span');
                sp.className = 'chip'; sp.dataset.ic = TERMS[m[2]]; sp.textContent = m[2];
                frag.append(sp);
                last = at + m[2].length;
            }
            if (frag) { frag.append(txt.slice(last)); n.replaceWith(frag); }
        });
    })();

    // ---------- hover scramble: characters near the cursor turn to = - ~ and restore ----------
    const DASH = '=-=-=~-_';
    const LIFE = 520, RAD = 5;
    const hov = new Map();          // text node -> { orig, hero, hits:[{c,t}] }
    let hovTimer = 0;

    function caretAt(x, y) {
        if (document.caretPositionFromPoint) {
            const p = document.caretPositionFromPoint(x, y);
            return p && p.offsetNode ? { n: p.offsetNode, o: p.offset } : null;
        }
        if (document.caretRangeFromPoint) {
            const r = document.caretRangeFromPoint(x, y);
            return r ? { n: r.startContainer, o: r.startOffset } : null;
        }
        return null;
    }
    function overChar(n, o, x, y) {
        const len = n.nodeValue.length;
        if (!len) return false;
        const a = Math.min(o, len - 1), r = document.createRange();
        r.setStart(n, a); r.setEnd(n, a + 1);
        const b = r.getBoundingClientRect();
        return x > b.left - 28 && x < b.right + 28 && y > b.top - 6 && y < b.bottom + 6;
    }
    function eligible(n) {
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return false;
        const p = n.parentElement;
        if (!p || !p.closest('.content-section.active') || p.closest('.boot-bar, .lab-controls')) return false;
        const t = p.closest('.type-target');
        return !(t && (t._decoding || t.style.visibility === 'hidden'));
    }
    function hovTick() {
        hovTimer = 0;
        const now = performance.now();
        hov.forEach((s, n) => {
            if (!n.isConnected) { hov.delete(n); return; }
            s.hits = s.hits.filter((h) => now - h.t < LIFE);
            if (!s.hits.length) { n.nodeValue = s.orig; hov.delete(n); return; }
            const set = s.hero ? SC : DASH;
            let out = '';
            for (let i = 0; i < s.orig.length; i++) {
                const ch = s.orig[i];
                let hit = false;
                if (ch !== ' ') for (const h of s.hits) {
                    if (Math.abs(i - h.c) <= RAD && Math.random() < 0.9 * (1 - (now - h.t) / LIFE)) { hit = true; break; }
                }
                out += hit ? set[(Math.random() * set.length) | 0] : ch;
            }
            n.nodeValue = out;
        });
        if (hov.size) hovTimer = setTimeout(hovTick, 45);
    }
    function hoverText(x, y) {
        const c = caretAt(x, y);
        if (!c || !eligible(c.n) || !overChar(c.n, c.o, x, y)) return;
        let s = hov.get(c.n);
        if (!s) { s = { orig: c.n.nodeValue, hero: !!c.n.parentElement.closest('#index'), hits: [] }; hov.set(c.n, s); }
        s.hits.push({ c: c.o, t: performance.now() });
        if (s.hits.length > 14) s.hits.shift();
        if (!hovTimer) hovTimer = setTimeout(hovTick, 0);
    }

    // cursor: drives rain + hover scramble
    let pt = 0;
    addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        const n = performance.now();
        if (RM || !cfg.scramble || n - pt < 30 || e.pointerType === 'touch') return;
        pt = n;
        hoverText(e.clientX, e.clientY);
    });

    // ---------- HUD: control panel + FPS ----------
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = '<button type="button" id="cp-btn" aria-expanded="false" aria-controls="cp">Control Panel <span>[+]</span></button><span id="fps">-- FPS</span>';
    document.body.appendChild(hud);
    const cp = document.createElement('div');
    cp.id = 'cp';
    document.body.appendChild(cp);

    function apply(key) {
        if (key === 'rain') { cfg.rain ? start() : stop(); }
        else if (key === 'density' || key === 'trail') { if (running) resize(); }
        else if (key === 'meadow') buildCluster();
        else if (key === 'scanlines') document.body.classList.toggle('no-scan', !cfg.scanlines);
    }
    function row(label, key, min, max, step) {
        const r = document.createElement('label'), t = document.createElement('span'), i = document.createElement('input'), v = document.createElement('em');
        const bool = typeof cfg[key] === 'boolean';
        r.className = 'cp-row'; t.textContent = label;
        if (bool) { i.type = 'checkbox'; i.checked = cfg[key]; }
        else { i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = cfg[key]; v.textContent = cfg[key]; }
        i.addEventListener('input', () => { cfg[key] = bool ? i.checked : +i.value; if (!bool) v.textContent = cfg[key]; apply(key); });
        r.append(t, i, v);
        return r;
    }
    [['Rain', [['ascii rain', 'rain'], ['density', 'density', 0.1, 1, 0.05], ['fall speed', 'speed', 0.3, 3, 0.1], ['trail length', 'trail', 2, 12, 1], ['cursor radius', 'radius', 60, 260, 10], ['home cluster', 'meadow']]],
     ['Site', [['hover scramble', 'scramble'], ['crt scanlines', 'scanlines'], ['grid wipe', 'wipe']]]].forEach(([title, rows]) => {
        const h = document.createElement('div'); h.className = 'cp-h'; h.textContent = title; cp.appendChild(h);
        rows.forEach((a) => cp.appendChild(row(a[0], a[1], a[2], a[3], a[4])));
    });
    $('#cp-btn').addEventListener('click', () => {
        const open = cp.classList.toggle('open');
        $('#cp-btn').setAttribute('aria-expanded', open);
        $('#cp-btn span').textContent = open ? '[-]' : '[+]';
    });

    let frames = 0, ft = performance.now();
    (function fps(n) {
        frames++;
        if (n - ft >= 500) {
            const mem = performance.memory ? ` / ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB` : '';
            $('#fps').textContent = `${Math.round(frames * 1000 / (n - ft))} FPS${mem}`;
            frames = 0; ft = n;
        }
        requestAnimationFrame(fps);
    })(ft);

    // ---------- trophies panel ----------
    const TR = [['explored', 'EXPLORER', 'explore 3+ sections'], ['project', 'BUILDER', 'open a project'], ['lab', 'SCIENTIST', 'find the lab'], ['tuned', 'TUNER', 'tune the RAG agent'], ['reached-out', 'SIGNAL', 'reach out']];
    const tp = document.createElement('div');
    tp.id = 'trophy-panel';
    document.body.appendChild(tp);
    function showTrophies() {
        let m = {}; try { m = JSON.parse(localStorage.getItem('om_milestones') || '{}'); } catch (e) {}
        tp.innerHTML = TR.map(([id, n, d]) => `<div class="${m[id] ? 'got' : ''}"><b>${m[id] ? '[x]' : '[ ]'}</b> ${n}<span>${d}</span></div>`).join('');
        tp.classList.toggle('open');
    }

    // ---------- boot sequence ----------
    function typeSidebar() {
        const root = document.documentElement;
        if (RM) { root.classList.remove('booting'); return; }
        let t = 0;
        document.querySelectorAll('#sidebar .breadcrumb, #sidebar .folder, #sidebar .nav-item').forEach((el) => {
            const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
            const full = tn ? tn.textContent : '';
            if (tn) tn.textContent = '';
            setTimeout(() => {
                el.classList.add('typed');
                if (!tn) return;
                let i = 0;
                const iv = setInterval(() => { tn.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(iv); }, 9);
            }, t);
            t += Math.min(full.trim().length, 12) * 9 + 20;
        });
        setTimeout(() => root.classList.remove('booting'), t + 300);
    }
    function runBar(bar, ms, done) {
        const N = 24, t0 = performance.now();
        (function step(n) {
            const raw = Math.min(1, (n - t0) / ms), p = raw * raw * (3 - 2 * raw), k = Math.round(p * N);
            bar.textContent = '[' + '\u25AA'.repeat(k) + '\u00B7'.repeat(N - k) + '] ' + String(Math.round(p * 100)).padStart(3, ' ') + '%';
            raw < 1 ? requestAnimationFrame(step) : setTimeout(done, 150);
        })(t0);
    }
    function boot(initial, decode) {
        const els = [...document.getElementById(initial).querySelectorAll('.type-target')];
        start(); typeSidebar();
        const bar = $('#boot-bar');
        if (initial === 'index' && bar && !RM) {
            setTimeout(() => decode(els.slice(0, -1)), 400);
            runBar(bar, 1500, () => { bar.remove(); decode(els.slice(-1)); });
        } else {
            if (bar) bar.remove();
            setTimeout(() => decode(els), 400);
        }
    }

    const gate = window.OmLoader ? window.OmLoader.ready : Promise.resolve();
    window.OmFX = { cfg, boot: (i, d) => gate.then(() => boot(i, d)), showTrophies };
})();
