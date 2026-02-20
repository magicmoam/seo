// landing.js - Full-screen Three.js 3D hero landing page for trySEO.ai
import { getUser, signIn } from '../auth.js';
import { navigate } from '../router.js';

let _container = null;
let _renderer = null;
let _scene = null;
let _camera = null;
let _controls = null;
let _clock = null;
let _animFrameId = null;
let _heroGroup = null;
let _mainMesh = null;
let _ring1 = null;
let _ring2 = null;
let _mouseX = 0;
let _mouseY = 0;
let _windowHalfX = window.innerWidth / 2;
let _windowHalfY = window.innerHeight / 2;

// Event handler references for cleanup
let _onMouseMove = null;
let _onResize = null;
let _scrollHandler = null;
let _sectionObserver = null;

export async function mount(container) {
  _container = container;

  // Build HTML structure
  _container.innerHTML = _html();

  // Bind CTA buttons
  _container.querySelectorAll('.landing-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const user = getUser();
      if (user) {
        navigate('/app');
      } else {
        signIn();
      }
    });
  });

  // Bind footer card
  const footerCard = _container.querySelector('#footer-audit-card');
  if (footerCard) {
    footerCard.addEventListener('click', (e) => {
      e.preventDefault();
      const user = getUser();
      if (user) {
        navigate('/app');
      } else {
        signIn();
      }
    });
  }

  // Dot nav - scroll to sections
  const dots = _container.querySelectorAll('.dot-nav-btn');
  const sections = _container.querySelectorAll('.landing-section');
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (sections[i]) {
        sections[i].scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Track active section with IntersectionObserver
  _sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const idx = entry.target.dataset.sectionIndex;
        _setActiveDot(parseInt(idx, 10));
      }
    }
  }, { threshold: 0.5 });

  sections.forEach(s => _sectionObserver.observe(s));

  // Fade header + side elements on scroll
  const heroOverlay = _container.querySelector('#hero-overlay');
  const sideElements = _container.querySelector('#side-elements');
  _scrollHandler = () => {
    const scrollY = _container.querySelector('#landing-scroll').scrollTop;
    const vh = window.innerHeight;
    const fadeProgress = Math.min(1, scrollY / (vh * 0.5));

    if (heroOverlay) {
      heroOverlay.style.opacity = 1 - fadeProgress;
      heroOverlay.style.transform = `translateY(${-scrollY * 0.3}px)`;
    }
    if (sideElements) {
      sideElements.style.opacity = 1 - fadeProgress;
    }
  };
  const scrollContainer = _container.querySelector('#landing-scroll');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', _scrollHandler, { passive: true });
  }

  // Dynamically import Three.js
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    _initScene(THREE, OrbitControls);
  } catch (err) {
    console.error('Failed to load Three.js:', err);
  }
}

function _setActiveDot(activeIdx) {
  const dots = _container?.querySelectorAll('.dot-nav-btn');
  if (!dots) return;
  dots.forEach((dot, i) => {
    if (i === activeIdx) {
      dot.className = 'dot-nav-btn nav-link w-2 h-2 rounded-full bg-obsidian hover:scale-150 transition-all';
    } else {
      dot.className = 'dot-nav-btn nav-link w-1.5 h-1.5 rounded-full bg-obsidian/20 hover:bg-obsidian hover:scale-150 transition-all';
    }
  });
}

export function unmount() {
  // Cancel animation frame
  if (_animFrameId != null) {
    cancelAnimationFrame(_animFrameId);
    _animFrameId = null;
  }

  // Remove event listeners
  if (_onMouseMove) {
    document.removeEventListener('mousemove', _onMouseMove);
    _onMouseMove = null;
  }
  if (_onResize) {
    window.removeEventListener('resize', _onResize);
    _onResize = null;
  }

  // Scroll handler
  if (_scrollHandler) {
    const scrollContainer = _container?.querySelector('#landing-scroll');
    if (scrollContainer) scrollContainer.removeEventListener('scroll', _scrollHandler);
    _scrollHandler = null;
  }

  // Section observer
  if (_sectionObserver) {
    _sectionObserver.disconnect();
    _sectionObserver = null;
  }

  // Dispose controls
  if (_controls) {
    _controls.dispose();
    _controls = null;
  }

  // Dispose renderer
  if (_renderer) {
    _renderer.dispose();
    _renderer.domElement.remove();
    _renderer = null;
  }

  // Dispose scene objects
  if (_scene) {
    _scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    _scene = null;
  }

  _camera = null;
  _clock = null;
  _heroGroup = null;
  _mainMesh = null;
  _ring1 = null;
  _ring2 = null;
  _container = null;
}

function _initScene(THREE, OrbitControls) {
  const webglContainer = _container.querySelector('#webgl-container');
  if (!webglContainer) return;

  _scene = new THREE.Scene();
  _scene.fog = new THREE.FogExp2(0xF0F0EB, 0.02);

  _camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  _camera.position.set(0, 0, 8);

  _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  _renderer.setPixelRatio(window.devicePixelRatio);
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.2;
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  webglContainer.appendChild(_renderer.domElement);

  _controls = new OrbitControls(_camera, _renderer.domElement);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.03;
  _controls.enableZoom = false;
  _controls.autoRotate = true;
  _controls.autoRotateSpeed = 1.5;
  _controls.maxPolarAngle = Math.PI / 1.5;
  _controls.minPolarAngle = Math.PI / 3;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  _scene.add(ambientLight);

  const mainSpot = new THREE.SpotLight(0xffffff, 20);
  mainSpot.position.set(5, 5, 5);
  mainSpot.angle = 0.4;
  mainSpot.penumbra = 0.3;
  mainSpot.castShadow = true;
  mainSpot.shadow.bias = -0.0001;
  _scene.add(mainSpot);

  const fillLight = new THREE.PointLight(0xE6D5B8, 10);
  fillLight.position.set(-5, 0, 2);
  _scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xd4eaff, 5);
  backLight.position.set(0, 5, -5);
  _scene.add(backLight);

  _heroGroup = new THREE.Group();
  _scene.add(_heroGroup);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 1.5,
    ior: 1.7,
    dispersion: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xD4AF37,
    metalness: 1.0,
    roughness: 0.15,
  });

  const geometry = new THREE.TorusKnotGeometry(1.2, 0.3, 150, 20, 2, 3);
  _mainMesh = new THREE.Mesh(geometry, glassMaterial);
  _mainMesh.castShadow = true;
  _mainMesh.receiveShadow = true;
  _heroGroup.add(_mainMesh);

  const ringGeo = new THREE.TorusGeometry(2.5, 0.02, 16, 100);
  _ring1 = new THREE.Mesh(ringGeo, goldMaterial);
  _ring1.rotation.x = Math.PI / 1.8;
  _heroGroup.add(_ring1);

  _ring2 = new THREE.Mesh(ringGeo, goldMaterial);
  _ring2.rotation.x = Math.PI / 2.2;
  _ring2.rotation.y = Math.PI / 4;
  _ring2.scale.set(0.8, 0.8, 0.8);
  _heroGroup.add(_ring2);

  const particleGeo = new THREE.IcosahedronGeometry(0.05, 0);
  for (let i = 0; i < 30; i++) {
    const particle = new THREE.Mesh(particleGeo, goldMaterial);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 2 + Math.random() * 2;
    particle.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
    particle.userData = {
      angle: theta,
      radius: radius,
      speed: 0.005 + Math.random() * 0.01,
      yOffset: Math.random() * Math.PI
    };
    _heroGroup.add(particle);
  }

  _windowHalfX = window.innerWidth / 2;
  _windowHalfY = window.innerHeight / 2;

  _onMouseMove = (event) => {
    _mouseX = (event.clientX - _windowHalfX) * 0.0005;
    _mouseY = (event.clientY - _windowHalfY) * 0.0005;
  };
  document.addEventListener('mousemove', _onMouseMove);

  _clock = new THREE.Clock();

  function animate() {
    _animFrameId = requestAnimationFrame(animate);
    const time = _clock.getElapsedTime();
    _controls.update();

    _heroGroup.rotation.y += (_mouseX - _heroGroup.rotation.y) * 0.05;
    _heroGroup.rotation.x += (_mouseY - _heroGroup.rotation.x) * 0.05;
    _mainMesh.rotation.z = Math.sin(time * 0.2) * 0.1;
    _ring1.rotation.z += 0.002;
    _ring2.rotation.z -= 0.003;

    _heroGroup.children.forEach((child) => {
      if (child.userData.speed) {
        child.userData.angle += child.userData.speed;
        child.position.x = child.userData.radius * Math.cos(child.userData.angle);
        child.position.z = child.userData.radius * Math.sin(child.userData.angle);
        child.position.y += Math.sin(time + child.userData.yOffset) * 0.002;
        child.rotation.x += 0.02;
        child.rotation.y += 0.02;
      }
    });

    _renderer.render(_scene, _camera);
  }
  animate();

  _onResize = () => {
    _windowHalfX = window.innerWidth / 2;
    _windowHalfY = window.innerHeight / 2;
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
    _renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', _onResize);
}

function _html() {
  const tools = [
    { icon: '&#9678;', name: 'Website Analyzer', desc: 'Full-spectrum site audit with 30-point scoring' },
    { icon: '&#9883;', name: 'Keyword Research', desc: 'Intent-mapped keyword clusters with difficulty scoring' },
    { icon: '&#9733;', name: 'Competitor Analysis', desc: 'Gap identification and strategic positioning' },
    { icon: '&#9881;', name: 'Technical SEO', desc: 'Core Web Vitals, schema, and crawlability' },
    { icon: '&#9830;', name: 'Content Strategy', desc: 'AI-generated content calendars and briefs' },
    { icon: '&#8982;', name: 'SERP Analysis', desc: 'Feature detection and ranking factor analysis' },
  ];

  const toolsHTML = tools.map(t => `
    <div class="bg-white/30 backdrop-blur-sm border border-white/50 rounded-lg p-5 hover:bg-white/50 transition-all duration-300 group">
      <div class="flex items-start gap-4">
        <span class="text-2xl text-burnished-gold">${t.icon}</span>
        <div>
          <h4 class="font-serif text-base font-semibold mb-1">${t.name}</h4>
          <p class="font-sans text-xs text-obsidian/50 leading-relaxed">${t.desc}</p>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <!-- Fixed 3D background -->
    <div id="webgl-container"></div>

    <!-- Fixed dot nav -->
    <div class="fixed right-6 md:right-10 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-4 animate-in" style="animation-delay: 1.3s;">
      <button class="dot-nav-btn nav-link w-2 h-2 rounded-full bg-obsidian hover:scale-150 transition-all" aria-label="Hero"></button>
      <button class="dot-nav-btn nav-link w-1.5 h-1.5 rounded-full bg-obsidian/20 hover:bg-obsidian hover:scale-150 transition-all" aria-label="Intelligence"></button>
      <button class="dot-nav-btn nav-link w-1.5 h-1.5 rounded-full bg-obsidian/20 hover:bg-obsidian hover:scale-150 transition-all" aria-label="Tools"></button>
      <button class="dot-nav-btn nav-link w-1.5 h-1.5 rounded-full bg-obsidian/20 hover:bg-obsidian hover:scale-150 transition-all" aria-label="Get Started"></button>
    </div>

    <!-- Scrollable content -->
    <div id="landing-scroll" class="relative z-20 h-screen overflow-y-auto" style="scroll-snap-type: y mandatory; scroll-behavior: smooth;">

      <!-- Section 1: Hero -->
      <section class="landing-section h-screen w-full relative flex flex-col justify-between p-6 md:p-10" data-section-index="0" style="scroll-snap-align: start;">

        <div id="hero-overlay" class="h-full w-full flex flex-col justify-between">
          <!-- Header -->
          <header class="flex justify-between items-start pointer-events-auto w-full">
            <div class="flex items-center gap-4 animate-in" style="animation-delay: 0.1s;">
              <a href="#/" class="group relative">
                <span class="font-serif text-3xl font-semibold tracking-tighter">trySEO<span class="text-burnished-gold">.ai</span></span>
                <span class="absolute -bottom-1 left-0 w-0 h-px bg-obsidian transition-all duration-300 group-hover:w-full"></span>
              </a>
              <span class="hidden md:inline-block h-px w-8 bg-obsidian/20"></span>
              <span class="hidden md:inline-block font-sans text-[10px] tracking-[0.2em] uppercase text-soft-gray">SEO Intelligence</span>
            </div>
            <nav class="hidden md:flex gap-12 animate-in" style="animation-delay: 0.2s;">
              <a href="#/features" class="nav-link font-display text-lg italic text-obsidian/70 hover:text-obsidian transition-colors">Features</a>
              <a href="#/pricing" class="nav-link font-display text-lg italic text-obsidian/70 hover:text-obsidian transition-colors">Pricing</a>
              <a href="#/about" class="nav-link font-display text-lg italic text-obsidian/70 hover:text-obsidian transition-colors">About</a>
            </nav>
            <button class="nav-link group flex flex-col items-end gap-1.5 md:hidden animate-in" style="animation-delay: 0.3s;">
              <span class="font-sans text-[10px] tracking-widest uppercase mb-1">Menu</span>
              <span class="w-8 h-px bg-obsidian group-hover:w-12 transition-all duration-300"></span>
              <span class="w-5 h-px bg-obsidian group-hover:w-8 transition-all duration-300 delay-75"></span>
            </button>
          </header>

          <!-- Center hero text -->
          <main class="absolute top-1/2 left-0 right-0 -translate-y-1/2 w-full text-center pointer-events-none z-0">
            <div class="flex justify-between items-center w-full px-[5%] md:px-[10%] opacity-90">
              <h1 class="font-serif text-[12vw] leading-none tracking-tighter text-obsidian mix-blend-overlay animate-in" style="animation-delay: 0.5s;">AI</h1>
              <h1 class="font-serif text-[12vw] leading-none tracking-tighter text-obsidian mix-blend-overlay animate-in" style="animation-delay: 0.6s;">SEO</h1>
            </div>
            <div class="mt-16 md:mt-24">
              <p class="font-display italic text-xl md:text-2xl text-obsidian/60 tracking-wide animate-in" style="animation-delay: 0.8s;">The intelligence behind your rankings</p>
              <div class="mt-8 animate-in pointer-events-auto" style="animation-delay: 1s;">
                <a href="#/" class="landing-cta nav-link inline-flex items-center gap-3 px-6 py-3 border border-obsidian/20 hover:border-obsidian hover:bg-white/50 backdrop-blur-sm transition-all duration-500 rounded-full group">
                  <span class="font-sans text-[10px] uppercase tracking-[0.25em]">Start Free Audit</span>
                  <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </a>
              </div>
            </div>
          </main>

          <!-- Left side indicators -->
          <div id="side-elements" class="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-8 animate-in" style="animation-delay: 1.2s;">
            <div class="w-px h-16 bg-gradient-to-b from-transparent via-obsidian/30 to-transparent"></div>
            <span class="vertical-text font-sans text-[9px] uppercase tracking-[0.3em] text-soft-gray">Scroll</span>
            <div class="w-px h-16 bg-gradient-to-b from-transparent via-obsidian/30 to-transparent"></div>
          </div>

          <!-- Footer -->
          <footer class="flex justify-between items-end pointer-events-auto w-full animate-in" style="animation-delay: 0.4s;">
            <div class="hidden md:block">
              <div class="flex items-center gap-3 font-sans text-[10px] uppercase tracking-widest text-soft-gray">
                <span class="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
                <span>AI Engine Online</span>
              </div>
            </div>
            <div class="flex-1 md:flex-none text-center md:text-right">
              <a href="#/app" class="nav-link inline-block text-left bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-lg max-w-[280px] hover:bg-white/60 transition-colors cursor-pointer group" id="footer-audit-card">
                <div class="flex justify-between items-start mb-2">
                  <span class="font-serif text-lg italic">Site Audit</span>
                  <span class="font-sans text-[10px] border border-obsidian/20 rounded px-1.5 py-0.5 ml-4">FREE</span>
                </div>
                <div class="w-full h-px bg-obsidian/10 my-2"></div>
                <div class="flex justify-between items-end">
                  <span class="font-sans text-[10px] text-soft-gray uppercase tracking-wider">10 Tools, One Agent</span>
                  <span class="font-sans text-xs font-medium group-hover:translate-x-1 transition-transform">Try Now &rarr;</span>
                </div>
              </a>
            </div>
          </footer>
        </div>
      </section>

      <!-- Section 2: Intelligence -->
      <section class="landing-section min-h-screen w-full relative flex items-center" data-section-index="1" style="scroll-snap-align: start;">
        <div class="w-full max-w-6xl mx-auto px-6 md:px-16 py-24">
          <div class="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold mb-4 block">Why trySEO.ai</span>
              <h2 class="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-6">
                SEO shouldn't<br>require guesswork.
              </h2>
              <p class="font-display italic text-lg text-obsidian/50 leading-relaxed mb-8">
                One AI agent analyzes your entire SEO landscape — from technical health to content gaps to competitive positioning — and delivers an actionable strategy in minutes, not weeks.
              </p>
              <div class="flex items-center gap-6">
                <a href="#/features" class="nav-link inline-flex items-center gap-3 px-5 py-2.5 bg-obsidian text-alabaster rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-obsidian/85 transition-colors">
                  See All Features
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </a>
              </div>
            </div>
            <div class="space-y-6">
              <div class="bg-white/40 backdrop-blur-md border border-white/50 rounded-xl p-6">
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-burnished-gold/10 flex items-center justify-center text-burnished-gold font-serif text-sm">I</span>
                  <h3 class="font-serif text-lg font-semibold">Analyze</h3>
                </div>
                <p class="font-sans text-sm text-obsidian/50 leading-relaxed">Enter any URL. Our agent crawls, scores, and benchmarks across 30 criteria in seconds.</p>
              </div>
              <div class="bg-white/40 backdrop-blur-md border border-white/50 rounded-xl p-6">
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-burnished-gold/10 flex items-center justify-center text-burnished-gold font-serif text-sm">II</span>
                  <h3 class="font-serif text-lg font-semibold">Understand</h3>
                </div>
                <p class="font-sans text-sm text-obsidian/50 leading-relaxed">AI-driven competitive intelligence reveals gaps, opportunities, and your path to page one.</p>
              </div>
              <div class="bg-white/40 backdrop-blur-md border border-white/50 rounded-xl p-6">
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-burnished-gold/10 flex items-center justify-center text-burnished-gold font-serif text-sm">III</span>
                  <h3 class="font-serif text-lg font-semibold">Execute</h3>
                </div>
                <p class="font-sans text-sm text-obsidian/50 leading-relaxed">Get a prioritized roadmap, content calendar, and technical fixes — ready to implement.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Tools -->
      <section class="landing-section min-h-screen w-full relative flex items-center" data-section-index="2" style="scroll-snap-align: start;">
        <div class="w-full max-w-5xl mx-auto px-6 md:px-16 py-24">
          <div class="text-center mb-16">
            <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold mb-4 block">The Toolkit</span>
            <h2 class="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Ten tools. One intelligence.
            </h2>
            <p class="font-display italic text-lg text-obsidian/50 max-w-xl mx-auto">
              Each tool is purpose-built, but they work together as a unified system — the Strategy Orchestrator runs all ten in sequence.
            </p>
          </div>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${toolsHTML}
          </div>
          <div class="text-center mt-12">
            <a href="#/features" class="nav-link inline-flex items-center gap-3 px-5 py-2.5 border border-obsidian/20 hover:border-obsidian rounded-full text-[10px] uppercase tracking-[0.2em] font-sans transition-colors backdrop-blur-sm hover:bg-white/50">
              Explore All 10 Tools
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Section 4: Get Started -->
      <section class="landing-section min-h-screen w-full relative flex items-center" data-section-index="3" style="scroll-snap-align: start;">
        <div class="w-full max-w-4xl mx-auto px-6 md:px-16 py-24 text-center">
          <span class="font-sans text-[10px] uppercase tracking-[0.3em] text-burnished-gold mb-4 block">Get Started</span>
          <h2 class="font-serif text-4xl md:text-6xl font-semibold tracking-tight mb-6">
            Your rankings,<br>reimagined.
          </h2>
          <p class="font-display italic text-lg md:text-xl text-obsidian/50 max-w-2xl mx-auto mb-12">
            Start with a free audit. See exactly where you stand — and where you could be.
          </p>

          <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
            <div class="bg-white/40 backdrop-blur-md border border-white/50 rounded-xl p-8 text-left">
              <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-soft-gray">Free</span>
              <div class="font-serif text-4xl font-semibold mt-2 mb-1">$0</div>
              <p class="font-sans text-xs text-obsidian/40 mb-6">5 credits / month</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-2 font-sans text-sm text-obsidian/70">
                  <span class="text-burnished-gold">&#10003;</span> Full site audit
                </li>
                <li class="flex items-center gap-2 font-sans text-sm text-obsidian/70">
                  <span class="text-burnished-gold">&#10003;</span> Keyword research
                </li>
                <li class="flex items-center gap-2 font-sans text-sm text-obsidian/70">
                  <span class="text-burnished-gold">&#10003;</span> Technical analysis
                </li>
              </ul>
              <a href="#/" class="landing-cta nav-link block text-center px-5 py-2.5 border border-obsidian/20 hover:border-obsidian rounded-full text-[10px] uppercase tracking-[0.2em] font-sans transition-colors hover:bg-white/50">
                Start Free
              </a>
            </div>
            <div class="bg-obsidian text-alabaster rounded-xl p-8 text-left relative overflow-hidden">
              <div class="absolute top-0 right-0 w-32 h-32 bg-burnished-gold/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <span class="font-sans text-[10px] uppercase tracking-[0.2em] text-burnished-gold relative">Pro</span>
              <div class="font-serif text-4xl font-semibold mt-2 mb-1 relative">$49<span class="text-lg font-normal text-alabaster/40">/mo</span></div>
              <p class="font-sans text-xs text-alabaster/40 mb-6 relative">200 credits / month</p>
              <ul class="space-y-3 mb-8 relative">
                <li class="flex items-center gap-2 font-sans text-sm text-alabaster/70">
                  <span class="text-burnished-gold">&#10003;</span> All 10 tools
                </li>
                <li class="flex items-center gap-2 font-sans text-sm text-alabaster/70">
                  <span class="text-burnished-gold">&#10003;</span> Strategy orchestrator
                </li>
                <li class="flex items-center gap-2 font-sans text-sm text-alabaster/70">
                  <span class="text-burnished-gold">&#10003;</span> Export reports
                </li>
              </ul>
              <a href="#/pricing" class="nav-link block text-center px-5 py-2.5 bg-burnished-gold text-obsidian rounded-full text-[10px] uppercase tracking-[0.2em] font-sans hover:bg-burnished-gold/90 transition-colors relative">
                View Plans
              </a>
            </div>
          </div>

          <div class="flex items-center justify-center gap-6 text-soft-gray">
            <a href="#/about" class="nav-link font-display italic text-base hover:text-obsidian transition-colors">About</a>
            <span class="w-1 h-1 rounded-full bg-soft-gray/40"></span>
            <a href="#/features" class="nav-link font-display italic text-base hover:text-obsidian transition-colors">Features</a>
            <span class="w-1 h-1 rounded-full bg-soft-gray/40"></span>
            <a href="#/pricing" class="nav-link font-display italic text-base hover:text-obsidian transition-colors">Pricing</a>
          </div>

          <div class="mt-16 font-sans text-[10px] text-soft-gray/60 uppercase tracking-widest">
            &copy; 2026 trySEO.ai
          </div>
        </div>
      </section>

    </div>
  `;
}
