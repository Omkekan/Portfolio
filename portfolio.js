// --- 0. SHARED CAPABILITY FLAGS ---
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// --- 1. THREE.JS WEBGL BACKGROUND ---
function initThreeJS() {
    const container = document.getElementById('webgl-container');
    if (!container || !window.THREE) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020205, 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1200;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) { posArray[i] = (Math.random() - 0.5) * 120; }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({ size: 0.15, color: 0x00f3ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    camera.position.z = 30;

    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    let scrollVelocity = 0, lastScrollY = window.scrollY;
    
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    window.addEventListener('scroll', () => {
        scrollVelocity = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
    });

    function animate() {
        requestAnimationFrame(animate);
        targetX = mouseX * 0.001;
        targetY = mouseY * 0.001;

        particlesMesh.rotation.y += 0.0005;
        particlesMesh.scale.y = 1 + Math.abs(scrollVelocity) * 0.02;
        scrollVelocity *= 0.9;

        scene.rotation.y += 0.05 * (targetX - scene.rotation.y);
        scene.rotation.x += 0.05 * (targetY - scene.rotation.x);
        renderer.render(scene, camera);
    }

    if (prefersReducedMotion) { renderer.render(scene, camera); } else { animate(); }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- 2. CUSTOM FLUID LIQUID CURSOR ---
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
let ringX = mouseX, ringY = mouseY, velocity = 0, lastMouseX = mouseX, lastMouseY = mouseY;

if (isFinePointer) {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        cursorDot.style.left = `${mouseX}px`; cursorDot.style.top = `${mouseY}px`;
        const dx = mouseX - lastMouseX, dy = mouseY - lastMouseY;
        velocity = Math.sqrt(dx*dx + dy*dy);
        lastMouseX = mouseX; lastMouseY = mouseY;
    });
    function animateCursor() {
        ringX += (mouseX - ringX) * 0.2; ringY += (mouseY - ringY) * 0.2;
        cursorRing.style.left = `${ringX}px`; cursorRing.style.top = `${ringY}px`;
        cursorRing.style.borderRadius = velocity > 2 ? '40%' : '50%';
        velocity *= 0.8;
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
}

function bindCursorEvents() {
    if (!isFinePointer) return;
    const interactables = document.querySelectorAll('a, button, .btn-magnetic, .magnetic-target, .carousel-dot');
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

// --- 3. AUTO-SCROLLING CAROUSEL LOGIC ---
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const hoverArea = document.getElementById('carousel-hover-area');
    if(slides.length === 0) return;

    let currentSlide = 0;
    let carouselInterval;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active'); dots[currentSlide].classList.remove('active');
        currentSlide = index;
        slides[currentSlide].classList.add('active'); dots[currentSlide].classList.add('active');
    }

    function nextSlide() { goToSlide((currentSlide + 1) % slides.length); }
    function prevSlide() { goToSlide((currentSlide - 1 + slides.length) % slides.length); }
    function startCarousel() { if (!prefersReducedMotion) carouselInterval = setInterval(nextSlide, 5000); }
    function stopCarousel() { clearInterval(carouselInterval); }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => { goToSlide(index); stopCarousel(); startCarousel(); });
    });

    if (hoverArea) {
        hoverArea.addEventListener('mouseenter', stopCarousel);
        hoverArea.addEventListener('mouseleave', startCarousel);
        let touchStartX = 0;
        hoverArea.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; stopCarousel(); }, { passive: true });
        hoverArea.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const delta = touchEndX - touchStartX;
            if (Math.abs(delta) > 40) { delta < 0 ? nextSlide() : prevSlide(); }
            startCarousel();
        }, { passive: true });
    }
    startCarousel();
}

// --- 4. HACKER TEXT SCRAMBLE ---
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function scrambleText(element) {
    if (!element || !element.dataset || !element.dataset.value) return;
    const originalText = element.dataset.value;
    if (prefersReducedMotion) { element.innerText = originalText; return; }
    let iteration = 0;
    clearInterval(element.interval);
    
    element.interval = setInterval(() => {
        element.innerText = originalText.split("").map((letter, index) => {
            if(index < iteration) return originalText[index];
            return letters[Math.floor(Math.random() * letters.length)];
        }).join("");
        if(iteration >= originalText.length) clearInterval(element.interval);
        iteration += 1 / 2.5; 
    }, 30);
}

function bindHoverScrambles() {
    document.querySelectorAll('.scramble-hover').forEach(el => el.addEventListener('mouseenter', () => scrambleText(el)));
}

// --- 5. SYSTEM INITS (CMD PALETTE & CASE STUDIES) ---
function initCommandPalette() {
    const palette = document.getElementById('cmd-palette');
    const input = document.getElementById('cmd-input');
    const items = document.querySelectorAll('.cmd-item');
    if (!palette) return;

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            if (palette.open) { palette.close(); } 
            else { 
                palette.showModal(); 
                input.value = '';
                items.forEach(item => item.style.display = 'flex');
                input.focus(); 
                document.body.style.overflow = 'hidden'; 
            }
        }
    });

    palette.addEventListener('close', () => { document.body.style.overflow = ''; });
    palette.addEventListener('click', (e) => { 
        const rect = palette.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) palette.close(); 
    });
    
    items.forEach(item => item.addEventListener('click', () => palette.close()));

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'flex' : 'none';
        });
    });
}

function initCaseStudies() {
    const caseData = {
        rag: `
            <h3 class="text-white fs-4 font-outfit mb-2">Autonomous RAG Agent</h3>
            <p class="text-accent font-mono text-xs mb-4 border-bottom pb-2">PROBLEM & ARCHITECTURE</p>
            <p class="text-muted text-sm mb-3"><strong>The Problem:</strong> Standard RAG pipelines retrieve context and blindly answer. If the context doesn't contain the answer, they fail silently, leading to hallucinations.</p>
            <p class="text-muted text-sm mb-3"><strong>The Architecture:</strong> Implemented a cyclical flow using LangGraph. The retrieved documents are graded for relevance. If irrelevant, the query is actively rewritten and re-searched. The generated answer is subsequently graded for hallucinations against the documents. If it fails, regeneration triggers.</p>
            <p class="text-muted text-sm mb-3"><strong>Impact:</strong> The addition of multi-stage grading drastically reduced hallucination rates on complex, non-obvious internal queries.</p>
            <p class="text-muted text-sm"><strong>What I'd do differently:</strong> Switch from local Ollama grading to a smaller, specialized embedding classifier (like a fine-tuned cross-encoder) for the relevance checks to cut down the latency hit of cyclical LLM calls.</p>
        `,
        vuln: `
            <h3 class="text-white fs-4 font-outfit mb-2">Web Vuln Scanner</h3>
            <p class="color-pink font-mono text-xs mb-4 border-bottom pb-2">DATA CORRELATION & SCALE</p>
            <p class="text-muted text-sm mb-3"><strong>The Problem:</strong> Security teams are drowning in false positives. Dumping raw feeds from NVD, Exploit-DB, and GitHub Advisories into a dashboard creates unmanageable noise without operational context.</p>
            <p class="text-muted text-sm mb-3"><strong>The Architecture:</strong> A Flask/Redis stack processes 3+ security feeds asynchronously via Celery workers. A custom correlation engine maps raw CVEs to active, reported exploits, applying a risk-prioritization algorithm before the frontend ever sees the data.</p>
            <p class="text-muted text-sm mb-3"><strong>Impact:</strong> Achieved a ~90% reduction in vulnerability noise by strictly filtering unexploitable/irrelevant notices.</p>
            <p class="text-muted text-sm"><strong>What I'd do differently:</strong> Implement WebSockets instead of polling for the Next.js frontend to stream critical vulnerability alerts in real-time as the Celery background workers clear them.</p>
        `
    };

    const modal = document.getElementById('case-study-modal');
    const content = document.getElementById('case-study-content');
    if (!modal || !content) return;

    document.querySelectorAll('.expand-case-study').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const study = e.target.dataset.study;
            if (caseData[study]) {
                content.innerHTML = caseData[study];
                modal.showModal();
                document.body.style.overflow = 'hidden';
            }
        });
    });

    modal.addEventListener('close', () => { document.body.style.overflow = ''; });
    modal.addEventListener('click', (e) => { 
        const rect = modal.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) modal.close(); 
    });
}

// --- 6. BOOT SEQUENCE & REVEAL ---
document.addEventListener("DOMContentLoaded", () => {
    initThreeJS();
    initCarousel();
    initScrollProgress();
    initTerminalEasterEgg();
    initCommandPalette();
    initCaseStudies();
    
    document.querySelectorAll('.scramble-on-load').forEach(el => scrambleText(el));
    bindHoverScrambles();
    bindCursorEvents();
    
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0'; loader.style.visibility = 'hidden';
            setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); initScrollReveal(); }, 800); 
        }
    }, 1500); 
});

// --- 7. SCROLL OBSERVERS & COUNTERS ---
function initScrollReveal() {
    const elementsToReveal = document.querySelectorAll('.reveal');
    if (elementsToReveal.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) { entry.target.classList.add('active'); observer.unobserve(entry.target); }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });
        elementsToReveal.forEach(el => revealObserver.observe(el));
    }
}

function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${pct}%`;
    }
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); update();
}

function animateStatCounters() {
    const counters = document.querySelectorAll('.stat-counter');
    counters.forEach(el => {
        const target = parseInt(el.dataset.countTarget, 10) || 0;
        if (prefersReducedMotion) { el.textContent = target; return; }
        const duration = 900, start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });
}

function initTerminalEasterEgg() {
    const toast = document.getElementById('terminal-toast');
    if (!toast) return;
    let buffer = '', hideTimeout;
    document.addEventListener('keydown', (e) => {
        if (e.key.length !== 1) return; 
        buffer = (buffer + e.key.toLowerCase()).slice(-4);
        if (buffer === 'sudo') {
            toast.textContent = '🔓 sudo: permission granted. (you already have full access — it\'s my portfolio)';
            toast.classList.add('show');
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
            buffer = '';
        }
    });
}

// --- 8. 3D CSS DEEP PARALLAX & MAGNETIC BUTTONS ---
if (isFinePointer && !prefersReducedMotion) {
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.spatial-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        });
    });

    document.querySelectorAll('.spatial-card').forEach(card => {
        const content = card.querySelector('.card-content');
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect(), centerX = rect.width / 2, centerY = rect.height / 2;
            if(content) content.style.transform = `rotateX(${((e.clientY - rect.top - centerY) / centerY) * -5}deg) rotateY(${((e.clientX - rect.left - centerX) / centerX) * 5}deg)`;
        });
        card.addEventListener('mouseleave', () => { if(content) content.style.transform = `rotateX(0deg) rotateY(0deg)`; });
    });
}

function bindMagneticPhysics() {
    if (!isFinePointer || prefersReducedMotion) return;
    document.querySelectorAll('.magnetic-target').forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            elem.style.transform = `translate(${(e.clientX - (rect.left + rect.width / 2)) * 0.25}px, ${(e.clientY - (rect.top + rect.height / 2)) * 0.25}px)`;
        });
        elem.addEventListener('mouseleave', () => { elem.style.transform = `translate(0px, 0px)`; });
    });
}

// --- 9. API FETCHERS ---
(function () {
    const LANG_COLORS = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c', Jupyter: '#DA5B0B' };
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; 

    function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
    function getCache(key) { try { const raw = localStorage.getItem(key); if(!raw) return null; const data = JSON.parse(raw); return (Date.now() - data.timestamp > CACHE_TTL_MS) ? null : data.data; } catch (e) { return null; } }
    function setCache(key, data) { try { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data })); } catch (e) {} }
    function getStaleCache(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw).data : null; } catch (e) { return null; } }

    const SKELETON_CARD = `<div class="card-content d-flex flex-col h-100"><div class="d-flex align-center gap-3 mb-4"><div class="skeleton-avatar"></div><div class="d-flex flex-col gap-2" style="flex-grow:1;"><div class="skeleton-line" style="width:60%;"></div><div class="skeleton-line" style="width:40%;"></div></div></div><div class="d-flex flex-col gap-2"><div class="skeleton-line" style="width:100%;"></div><div class="skeleton-line" style="width:80%;"></div></div></div>`;

    function paintGitHubCard(container, username, profile, topLangs) {
        const langBar = topLangs.map(l => `<div class="gh-lang-segment" style="width:${l.pct}%; background:${l.color};"></div>`).join('');
        const langLegend = topLangs.map(l => `<div class="gh-lang-item"><span class="gh-lang-color" style="background:${l.color}"></span>${escapeHtml(l.name)} ${l.pct}%</div>`).join('');
        container.innerHTML = `
        <div class="card-content d-flex flex-col h-100 pop-out-1">
            <div class="d-flex align-center gap-3 mb-4 pop-out-2">
                <img src="${profile.avatar_url}" class="api-avatar" alt="${escapeHtml(profile.name || profile.login)}">
                <div><div class="text-white font-outfit fs-5 fw-500">${escapeHtml(profile.name || profile.login)}</div><div class="font-mono color-cyan text-xs">@${escapeHtml(profile.login)}</div></div>
            </div>
            <div class="api-stats d-flex justify-between mb-3 pop-out-1">
                <div class="d-flex flex-col"><span class="font-mono text-white stat-counter" data-count-target="${profile.public_repos}">0</span><span class="font-mono text-muted" style="font-size:0.6rem;">REPOSITORIES</span></div>
                <div class="d-flex flex-col text-right"><span class="font-mono text-white stat-counter" data-count-target="${profile.followers}">0</span><span class="font-mono text-muted" style="font-size:0.6rem;">FOLLOWERS</span></div>
            </div>
            ${topLangs.length ? `<div class="mb-4 pop-out-1"><div class="gh-lang-bar">${langBar}</div><div class="gh-lang-legend mt-2">${langLegend}</div></div>` : ''}
            <a href="${profile.html_url}" target="_blank" class="btn-magnetic link-arrow mt-auto magnetic-target scramble-hover pop-out-3 color-cyan" data-value="View Profile &rarr;">View Profile &rarr;</a>
        </div>`;
    }

    async function renderGitHubCard(username, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        const cacheKey = `gh_cache_${username}`;
        container.innerHTML = SKELETON_CARD;
        const cached = getCache(cacheKey);
        if (cached) { paintGitHubCard(container, username, cached.profile, cached.topLangs); return; }
        try {
            const profile = await (await fetch(`https://api.github.com/users/${username}`)).json();
            const repos = await (await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`)).json();
            const langCounts = {};
            repos.filter(r => !r.fork).forEach(r => { if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1; });
            const totalLangCount = Object.values(langCounts).reduce((a, b) => a + b, 0);
            const topLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
                .map(([name, count]) => ({ name, pct: totalLangCount ? Math.round((count / totalLangCount) * 100) : 0, color: LANG_COLORS[name] || '#8b93a1' }));
            setCache(cacheKey, { profile, topLangs });
            paintGitHubCard(container, username, profile, topLangs);
        } catch (err) {
            const stale = getStaleCache(cacheKey);
            if (stale) paintGitHubCard(container, username, stale.profile, stale.topLangs); else container.innerHTML = `<div class="card-content text-muted font-mono text-xs">GitHub offline.</div>`;
        }
    }

    function paintMediumCard(container, username, items) {
        const posts = (items || []).slice(0, 2).map(item => `<a href="${item.link}" target="_blank" class="magnetic-target pop-out-2" style="display:block; text-decoration: none; margin-bottom: 0.75rem;"><div class="feed-title text-white text-sm mb-1" style="opacity: 0.9;">${escapeHtml(item.title)}</div><div class="text-muted font-mono" style="font-size: 0.65rem;">${new Date(item.pubDate).toLocaleDateString()}</div></a>`).join('');
        container.innerHTML = `<div class="card-content d-flex flex-col h-100 pop-out-1"><div class="d-flex align-center gap-3 mb-4 pop-out-3"><div class="api-avatar d-flex align-center justify-center bg-white text-black fw-500 fs-5 font-outfit">M</div><div><div class="text-white font-outfit fs-5 fw-500">Articles</div><div class="font-mono text-muted text-xs">Latest writings</div></div></div><div class="mb-3">${posts || '<div class="text-muted font-mono text-xs">No posts found.</div>'}</div><a href="https://medium.com/@${username}" target="_blank" class="btn-magnetic link-arrow mt-auto magnetic-target scramble-hover pop-out-3 text-white" data-value="Read Blog &rarr;">Read Blog &rarr;</a></div>`;
    }

    async function renderMediumCard(username, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        const cacheKey = `medium_cache_${username}`;
        container.innerHTML = SKELETON_CARD;
        const cached = getCache(cacheKey);
        if (cached) { paintMediumCard(container, username, cached); return; }
        try {
            const data = await (await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(`https://medium.com/feed/@${username}`)}`)).json();
            if (data.status !== 'ok') throw new Error();
            setCache(cacheKey, data.items || []); paintMediumCard(container, username, data.items || []);
        } catch (err) {
            const stale = getStaleCache(cacheKey);
            if (stale) paintMediumCard(container, username, stale); else container.innerHTML = `<div class="card-content text-muted font-mono text-xs">Medium offline.</div>`;
        }
    }

    function renderLinkedInCard(data, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = `<div class="card-content d-flex flex-col h-100 pop-out-1"><div class="d-flex align-center gap-3 mb-4 pop-out-2"><img src="${data.avatar}" class="api-avatar" alt="${escapeHtml(data.name)}"><div><div class="text-white font-outfit fs-5 fw-500">${escapeHtml(data.name)}</div><div class="font-mono color-purple text-xs">Network Link</div></div></div><div class="api-stats mb-4 pop-out-1"><div class="text-white text-xs opacity-70 mb-2" style="line-height: 1.4;">${escapeHtml(data.headline)}</div><div class="text-muted font-mono" style="font-size: 0.65rem;">FOCUS: ${escapeHtml(data.facts[1].value)}</div></div><a href="${data.profileUrl}" target="_blank" class="btn-magnetic link-arrow mt-auto magnetic-target scramble-hover pop-out-3 color-purple" data-value="Connect &rarr;">Connect &rarr;</a></div>`;
    }

    Promise.all([ renderGitHubCard('Omkekan', 'github-card'), renderMediumCard('omkekan27', 'medium-card') ]).then(() => {
        renderLinkedInCard({ name: 'Om Kekan', headline: 'AI/ML Engineer · Generative AI & LLM Systems', avatar: 'Assets/Profile Picture.jpeg', facts: [ { label: 'Status', value: 'Open to work' }, { label: 'Focus', value: 'LLMs, RAG, AI Agents' } ], profileUrl: 'https://linkedin.com/in/omkekan' }, 'linkedin-card');
        bindMagneticPhysics(); bindHoverScrambles(); bindCursorEvents(); animateStatCounters();
        
        if (isFinePointer && !prefersReducedMotion) {
            document.querySelectorAll('.api-card').forEach(card => {
                const content = card.querySelector('.card-content');
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect(), cx = rect.width/2, cy = rect.height/2;
                    if(content) content.style.transform = `rotateX(${((e.clientY - rect.top - cy)/cy)*-5}deg) rotateY(${((e.clientX - rect.left - cx)/cx)*5}deg)`;
                });
                card.addEventListener('mouseleave', () => { if(content) content.style.transform = `rotateX(0deg) rotateY(0deg)`; });
            });
        }
    });
})();