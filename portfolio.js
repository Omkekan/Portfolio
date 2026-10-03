(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- LINE NUMBERS ----------
    const lineNumbersDiv = document.getElementById('line-numbers');
    let numbersHTML = '';
    for (let i = 1; i <= 60; i++) numbersHTML += `<span class="line-num">${i}</span>`;
    lineNumbersDiv.innerHTML = numbersHTML;

    // ---------- MILESTONES & TOAST ----------
    const MILESTONE_IDS = ['explored', 'project', 'lab', 'tuned', 'reached-out'];
    function getMilestones() { try { return JSON.parse(localStorage.getItem('om_milestones') || '{}'); } catch (e) { return {}; } }
    function setMilestone(id, label) {
        const m = getMilestones();
        if (m[id]) return;
        m[id] = true;
        try { localStorage.setItem('om_milestones', JSON.stringify(m)); } catch (e) {}
        updateMilestoneBadge();
        showToast(`milestone unlocked: ${label}`);
    }
    function updateMilestoneBadge() {
        const m = getMilestones();
        const count = MILESTONE_IDS.filter(id => m[id]).length;
        document.getElementById('milestones-count').textContent = `${count}/${MILESTONE_IDS.length}`;
    }
    const visitedSections = new Set();
    function trackVisit(id) {
        visitedSections.add(id);
        if (visitedSections.size >= 3) setMilestone('explored', 'explored 3+ sections');
        if (id === 'lab') setMilestone('lab', 'found the lab');
        if (id === 'rag-agent' || id === 'vuln-scanner') setMilestone('project', 'opened a project');
    }
    function showToast(text) {
        const toast = document.getElementById('toast');
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }
    document.querySelectorAll('a.nav-item[href^="mailto:"], a.nav-item[href*="resume"], a.nav-item[href*="github"], a.nav-item[href*="linkedin"]').forEach(el => {
        el.addEventListener('click', () => setMilestone('reached-out', 'reached out'));
    });
    const milestonesBadge = document.getElementById('milestones-badge');
    milestonesBadge.addEventListener('click', () => {
        const m = getMilestones();
        const lines = [['explored', 'explore 3+ sections'], ['project', 'open a project'], ['lab', 'find the lab'], ['tuned', 'tune the RAG agent'], ['reached-out', 'reach out']]
            .map(([id, label]) => `${m[id] ? '[x]' : '[ ]'} ${label}`).join('\n');
        if (window.OmFX) OmFX.showTrophies(); else alert('Milestones\n\n' + lines);
    });

    // ---------- GLOBAL TEXT SCRAMBLE (DECODE EFFECT) ----------
    const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*/\\|{}[]()~<>-_+";
    let asciiIntervals = [];
    const DASH_CHARS = "=-=-=~-_"; // body text decodes out of = and - like the reference; hero keeps the symbol mix

    // Decodes the text rapidly to mimic the video's load-in effect
    function scrambleText(element) {
        const originalHTML = element.getAttribute('data-original-html') || element.innerHTML;
        const originalText = element.getAttribute('data-original-text') || element.textContent.trim();
        
        if (!element.hasAttribute('data-original-html')) {
            element.setAttribute('data-original-html', originalHTML);
            element.setAttribute('data-original-text', originalText);
        }
        
        element.style.visibility = 'visible';

        if (prefersReducedMotion || originalText.length === 0) { 
            element.innerHTML = originalHTML; 
            return; 
        }

        const charset = element.closest('#index') ? SCRAMBLE_CHARS : DASH_CHARS;
        element._decoding = true;
        let iteration = 0;
        const maxIterations = 15; // Fast scramble
        clearInterval(element._intervalId);

        element._intervalId = setInterval(() => {
            element.textContent = originalText.split('').map((char, index) => {
                if (char === ' ' || char === '\n') return char;
                if (index < (iteration / maxIterations) * originalText.length) return originalText[index];
                return charset[Math.floor(Math.random() * charset.length)];
            }).join('');
            
            if (iteration >= maxIterations) {
                clearInterval(element._intervalId);
                element.innerHTML = originalHTML; // Restore exact HTML (links, bold tags) when done
                element._decoding = false;
            }
            iteration++;
        }, 20); // Extremely fast update loop
        asciiIntervals.push(element._intervalId);
    }

    // ---------- PROCEDURAL GRID WIPE TRANSITION ----------
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'transition-grid';
    document.body.appendChild(gridOverlay);
    let gridCols = 0, gridRows = 0;
    const CELL_SIZE = 45;

    function setupTransitionGrid() {
        gridCols = Math.ceil(window.innerWidth / CELL_SIZE);
        gridRows = Math.ceil(window.innerHeight / CELL_SIZE);
        gridOverlay.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
        gridOverlay.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
        gridOverlay.innerHTML = '';
        const total = gridCols * gridRows;
        for (let i = 0; i < total; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            gridOverlay.appendChild(cell);
        }
    }
    window.addEventListener('resize', setupTransitionGrid);
    setupTransitionGrid();

    let isTransitioning = false;

    function playGridTransition(onCovered) {
        if (prefersReducedMotion || (window.OmFX && !OmFX.cfg.wipe)) { onCovered(); return; }
        if (isTransitioning) return;
        isTransitioning = true;

        const cells = Array.from(gridOverlay.children);
        
        // Group cells by column to achieve the bottom-to-top wave seen in the video
        const columns = Array.from({length: gridCols}, () => []);
        cells.forEach((cell, i) => columns[i % gridCols].push(cell));

        // Randomize column delay, but sequence rows from bottom to top
        let maxDelayIn = 0;
        columns.forEach(col => {
            const colDelay = Math.random() * 250;
            col.forEach((cell, rIdx) => {
                const reverseRIdx = gridRows - 1 - rIdx; // Bottom row fires first
                const delay = colDelay + (reverseRIdx * 25);
                maxDelayIn = Math.max(maxDelayIn, delay);
                setTimeout(() => cell.classList.add('active'), delay);
            });
        });

        // Once screen is blacked out, swap content and reverse the animation
        setTimeout(() => {
            onCovered(); // Change DOM underneath the grid

            let maxDelayOut = 0;
            columns.forEach(col => {
                const colDelay = Math.random() * 250;
                col.forEach((cell, rIdx) => {
                    const delay = colDelay + (rIdx * 25); // Top row clears first
                    maxDelayOut = Math.max(maxDelayOut, delay);
                    setTimeout(() => cell.classList.remove('active'), delay);
                });
            });

            setTimeout(() => { isTransitioning = false; }, maxDelayOut + 100);

        }, maxDelayIn + 100);
    }

    // ---------- ANIMATED INTERACTIVE CANVAS (CENTRAL REPULSION) ----------
    const RainEngine = (function () {
        const canvas = document.getElementById('rain-canvas');
        if (!canvas) return { start() {}, stop() {} };
        const ctx = canvas.getContext('2d');
        const fontSize = 16;
        const chars = ['.', ',', ':', ';', '+', '*', '?', '%', '$', '#', '@'];
        let width = 0, height = 0, cols = 0, rows = 0;
        
        let backgroundRain = []; // Sparse falling background
        let centralCluster = []; // Central block that reacts to mouse

        let mouseX = -1000, mouseY = -1000;
        let rafId = null, running = false;

        function initData() {
            cols = Math.floor(width / fontSize) + 1;
            rows = Math.floor(height / fontSize) + 1;
            
            backgroundRain = Array.from({ length: cols }, () => ({
                y: Math.random() * -height,
                speed: 1 + Math.random() * 2,
                char: chars[Math.floor(Math.random() * 5)]
            }));

            centralCluster = [];
            const centerX = width / 2;
            const centerY = height / 2 - 40;
            const radius = 120; // Size of the central character block

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * fontSize + fontSize / 2;
                    const y = j * fontSize + fontSize / 2;
                    const dx = x - centerX;
                    const dy = y - centerY;
                    
                    // Create a central circular cluster of dense characters
                    if (Math.sqrt(dx * dx + dy * dy) < radius) {
                        if (Math.random() > 0.3) {
                            centralCluster.push({
                                baseX: x, baseY: y,
                                x: x, y: y,
                                vx: 0, vy: 0,
                                char: chars[Math.floor(Math.random() * chars.length)]
                            });
                        }
                    }
                }
            }
        }

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            width = canvas.width = Math.round(rect.width);
            height = canvas.height = Math.round(rect.height);
            initData();
        }

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });
        canvas.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });

        function frame() {
            if (!running) return;
            ctx.fillStyle = '#1a1c1a';
            ctx.fillRect(0, 0, width, height);
            ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 1. Draw faint falling background rain
            ctx.fillStyle = 'rgba(163, 182, 138, 0.1)';
            backgroundRain.forEach((drop, i) => {
                const x = i * fontSize + fontSize / 2;
                ctx.fillText(drop.char, x, drop.y);
                drop.y += drop.speed;
                if (drop.y > height + 20) { drop.y = Math.random() * -100; drop.char = chars[Math.floor(Math.random() * 5)]; }
            });

            // 2. Process physics for the central cluster
            const interactRadius = 150; 
            ctx.fillStyle = 'rgba(163, 182, 138, 0.7)'; // Brighter central text

            centralCluster.forEach(cell => {
                const dx = mouseX - cell.x;
                const dy = mouseY - cell.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Repel away from mouse
                if (dist < interactRadius) {
                    const force = (interactRadius - dist) * 0.05;
                    const angle = Math.atan2(dy, dx);
                    cell.vx -= Math.cos(angle) * force;
                    cell.vy -= Math.sin(angle) * force;
                    
                    // Scramble character wildly when pushed
                    if (Math.random() < 0.2) cell.char = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                }

                // Spring back to base position
                const homeDx = cell.baseX - cell.x;
                const homeDy = cell.baseY - cell.y;
                cell.vx += homeDx * 0.05; // Spring strength
                cell.vy += homeDy * 0.05;

                // Friction
                cell.vx *= 0.8;
                cell.vy *= 0.8;

                cell.x += cell.vx;
                cell.y += cell.vy;

                ctx.fillText(cell.char, cell.x, cell.y);
            });

            rafId = requestAnimationFrame(frame);
        }

        function start() {
            if (prefersReducedMotion || running) return;
            resize();
            running = true;
            rafId = requestAnimationFrame(frame);
        }
        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        }
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { if (running) resize(); }, 150);
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop(); else if (document.getElementById('index').classList.contains('active')) start();
        });

        return { start, stop };
    })();

    // ---------- SECTION SWITCHING ----------
    function switchSection(targetId, pushHash) {
        if (isTransitioning) return; // Prevent double-clicks during wipe
        const target = document.getElementById(targetId);
        if (!target) return;

        playGridTransition(() => {
            // This callback fires when the screen is completely covered by the grid

            asciiIntervals.forEach(clearInterval);
            asciiIntervals = [];

            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

            target.classList.add('active');
            document.querySelectorAll(`.nav-item[data-target="${targetId}"]`).forEach(i => i.classList.add('active'));

            document.getElementById('main-view').scrollTop = 0;

            // Apply scramble effect to ALL text targeting elements (headers, paragraphs, lists)
            const textEls = target.querySelectorAll('.type-target');
            textEls.forEach(el => el.style.visibility = 'hidden'); // Hide until scheduled

            // Stagger the decoding slightly for a cascading load-in feel
            Array.from(textEls).forEach((el, index) => {
                setTimeout(() => scrambleText(el), index * 35);
            });

            if (targetId === 'index') RainEngine.start(); else RainEngine.stop();

            trackVisit(targetId);
            if (pushHash !== false && location.hash !== '#' + targetId) {
                history.replaceState(null, '', '#' + targetId);
            }
        });

        closeMobileMenu();
    }

    document.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(el.getAttribute('data-target'));
        });
    });

    window.addEventListener('hashchange', () => {
        const id = location.hash.replace('#', '');
        if (id) switchSection(id, false);
    });

    // ---------- MOBILE MENU ----------
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const menuToggle = document.getElementById('menu-toggle');

    function openMobileMenu() {
        sidebar.classList.add('open');
        backdrop.classList.add('show');
        menuToggle.setAttribute('aria-expanded', 'true');
    }
    function closeMobileMenu() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('show');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
    menuToggle.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
    });
    backdrop.addEventListener('click', closeMobileMenu);

    // ---------- LAB: TUNABLE RAG DIAGRAM ----------
    const labThreshold = document.getElementById('lab-threshold');
    const labThresholdVal = document.getElementById('lab-threshold-val');
    const labForce = document.getElementById('lab-force');
    const labStatus = document.getElementById('lab-status');
    const labNodes = {
        query: document.querySelector('.lab-node[data-node="query"]'),
        retrieve: document.querySelector('.lab-node[data-node="retrieve"]'),
        grade: document.querySelector('.lab-node[data-node="grade"]'),
        generate: document.querySelector('.lab-node[data-node="generate"]'),
        answer: document.querySelector('.lab-node[data-node="answer"]')
    };
    const loopRewrite = document.querySelector('.loop-tag[data-loop="rewrite"]');
    const loopRegenerate = document.querySelector('.loop-tag[data-loop="regenerate"]');

    function resetLab() {
        Object.values(labNodes).forEach(n => n && n.classList.remove('on', 'warn'));
        loopRewrite.classList.remove('on');
        loopRegenerate.classList.remove('on');
        labStatus.classList.remove('warn');
    }
    function lightUp(ids, cls) { ids.forEach(id => labNodes[id] && labNodes[id].classList.add(cls || 'on')); }

    function updateLab() {
        resetLab();
        const threshold = parseInt(labThreshold.value, 10);
        const forceHallucination = labForce.checked;

        if (threshold < 40) {
            lightUp(['query', 'retrieve']);
            lightUp(['grade'], 'warn');
            loopRewrite.classList.add('on');
            labStatus.textContent = `retrieved context scored ${threshold}/100 \u2014 below the relevance threshold. Rewriting query\u2026`;
            labStatus.classList.add('warn');
        } else if (forceHallucination) {
            lightUp(['query', 'retrieve', 'grade']);
            lightUp(['generate'], 'warn');
            loopRegenerate.classList.add('on');
            labStatus.textContent = 'generated answer failed the hallucination check. Regenerating\u2026';
            labStatus.classList.add('warn');
        } else {
            lightUp(['query', 'retrieve', 'grade', 'generate', 'answer']);
            labStatus.textContent = `context relevant (${threshold}/100) and the answer passed verification.`;
        }
    }
    let labInteracted = false;
    labThreshold.addEventListener('input', () => {
        labThresholdVal.textContent = labThreshold.value;
        updateLab();
        if (!labInteracted) { labInteracted = true; setMilestone('tuned', 'tuned the RAG agent'); }
    });
    labForce.addEventListener('change', () => { updateLab(); if (!labInteracted) { labInteracted = true; setMilestone('tuned', 'tuned the RAG agent'); } });
    updateLab();

    // ---------- EASTER EGG ----------
    (function () {
        const target = 'sudo';
        let buffer = '';
        document.addEventListener('keydown', (e) => {
            if (e.key.length !== 1) return;
            buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
            if (buffer === target) { showToast('sudo: permission granted'); buffer = ''; }
        });
    })();

    // ---------- BOOT ----------
    updateMilestoneBadge();
    const initial = location.hash ? location.hash.replace('#', '') : 'index';
    
    // Instead of raw switch, apply the initial decode on first load
    const target = document.getElementById(initial);
    if (target) {
        // deep links (#skills etc.): clear the default-active home section first, otherwise both render
        document.querySelectorAll('.content-section.active').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.nav-item.active').forEach(i => i.classList.remove('active'));
        target.classList.add('active');
        trackVisit(initial);
        document.querySelectorAll(`.nav-item[data-target="${initial}"]`).forEach(i => i.classList.add('active'));
        const decode = (els) => els.forEach((el, i) => setTimeout(() => scrambleText(el), i * 35));
        if (window.OmFX) OmFX.boot(initial, decode);
        else decode(Array.from(target.querySelectorAll('.type-target')));
    }
})();