gsap.registerPlugin(ScrollTrigger);

/* respect OS-level reduced-motion preference */
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────────────
   LENIS — smooth scroll, wired to GSAP ticker
───────────────────────────────────────────────────────── */
const lenis = new Lenis({
  duration: 1.4,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothTouch: false,
});

gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);
window.lenis = lenis;

/* anchor links → lenis.scrollTo */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72, duration: 1.6 });
  });
});

/* ─────────────────────────────────────────────────────────
   STICKY HEADER
───────────────────────────────────────────────────────── */
const header = document.getElementById('header');
lenis.on('scroll', ({ scroll }) => {
  header.classList.toggle('scrolled', scroll > 40);
});

/* ─────────────────────────────────────────────────────────
   MOBILE BURGER
───────────────────────────────────────────────────────── */
const burger    = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

burger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
  const spans = burger.querySelectorAll('span');
  if (open) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    lenis.stop();
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    lenis.start();
  }
});

function closeMobileNav() {
  mobileNav.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  burger.querySelectorAll('span').forEach(s => {
    s.style.transform = ''; s.style.opacity = '';
  });
  lenis.start();
}

document.querySelectorAll('.nav__mobile .nav__link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
    closeMobileNav();
    burger.focus();
    return;
  }
  /* focus trap inside open mobile nav */
  if (e.key === 'Tab' && mobileNav.classList.contains('open')) {
    const focusable = Array.from(mobileNav.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/* ─────────────────────────────────────────────────────────
   splitLines(el) — Dala technique
   Wraps each visual text line in .line-mask > .line-inner
   Returns array of .line-inner elements
───────────────────────────────────────────────────────── */
function splitLines(el) {
  const rawText = el.textContent.trim();
  el.setAttribute('aria-label', rawText);
  el.innerHTML = '';

  /* render words as inline spans to detect line breaks */
  rawText.split(/\s+/).filter(Boolean).forEach(word => {
    const s = document.createElement('span');
    s.textContent = word + '\u00a0'; // non-breaking space preserves gaps
    s.style.display = 'inline';
    el.appendChild(s);
  });

  /* group spans by their vertical position */
  const wordEls = Array.from(el.children);
  const lineGroups = [];
  let currentTop = null;
  let currentGroup = [];

  wordEls.forEach(w => {
    const top = w.getBoundingClientRect().top;
    if (currentTop === null) currentTop = top;
    if (Math.abs(top - currentTop) > 4) {
      lineGroups.push(currentGroup);
      currentGroup = [];
      currentTop = top;
    }
    currentGroup.push(w);
  });
  if (currentGroup.length) lineGroups.push(currentGroup);

  /* rebuild as .line-mask > .line-inner */
  el.innerHTML = '';
  const lineInners = [];

  lineGroups.forEach(group => {
    const mask  = document.createElement('span');
    mask.className = 'line-mask';

    const inner = document.createElement('span');
    inner.className = 'line-inner';
    inner.textContent = group.map(w => w.textContent).join('').trimEnd();

    mask.appendChild(inner);
    el.appendChild(mask);
    lineInners.push(inner);
  });

  return lineInners;
}

/* ─────────────────────────────────────────────────────────
   ANIMATIONS — deferred until fonts load so getBoundingClientRect
   measures correctly and splitLines groups lines properly
───────────────────────────────────────────────────────── */
/* C4: fonts.ready with 2s timeout — page reveals even if Google Fonts is slow */
const fontsReady = Promise.race([
  document.fonts.ready,
  new Promise(resolve => setTimeout(resolve, 2000)),
]);

fontsReady.then(() => {

  /* W6: prefers-reduced-motion — skip line-mask reveal, show plain text */
  if (REDUCED_MOTION) {
    document.querySelectorAll('.gsap-hero, .gsap-hero-fade, .gsap-reveal, .gsap-reveal-fade')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  /* ── Hero text reveal ── */
  const heroEls = document.querySelectorAll('.gsap-hero');

  heroEls.forEach((el, i) => {
    const lines = splitLines(el);
    gsap.set(lines, { y: '120%', rotation: 7, transformOrigin: '0 0' });
    gsap.to(lines, {
      y: 0,
      rotation: 0,
      duration: 1.5,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.2 + i * 0.18,
      onComplete: () => lines.forEach(l => { l.style.willChange = 'auto'; }),
    });
  });

  /* hero CTA + avatar fade in */
  gsap.set('.gsap-hero-fade', { opacity: 0, y: 20 });
  gsap.to('.gsap-hero-fade', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power2.out',
    stagger: 0.15,
    delay: 1.2,
  });

  /* ── Scroll reveal — text elements ── */
  document.querySelectorAll('.gsap-reveal').forEach(el => {
    const lines = splitLines(el);
    gsap.set(lines, { y: '120%', rotation: 7, transformOrigin: '0 0' });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(lines, {
          y: 0,
          rotation: 0,
          duration: 1.4,
          ease: 'power3.out',
          stagger: 0.1,
        });
      },
    });
  });

  /* ── Scroll reveal — fade-only grid wrappers (fallback) ── */
  document.querySelectorAll('.gsap-reveal-fade').forEach(el => {
    /* skip grids that get per-item animation below */
    if (el.classList.contains('about__grid') ||
        el.classList.contains('skills__grid') ||
        el.classList.contains('projects__grid') ||
        el.classList.contains('contact__links')) return;
    gsap.set(el, { opacity: 0, y: 32 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' });
      },
    });
  });

  /* ── Per-item stagger — About cards ── */
  const aboutCards = document.querySelectorAll('.about__card');
  gsap.set(aboutCards, { opacity: 0, y: 48 });
  ScrollTrigger.create({
    trigger: '.about__grid',
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(aboutCards, {
        opacity: 1, y: 0,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.18,
      });
    },
  });

  /* ── Per-item stagger — Skill groups ── */
  const skillGroups = document.querySelectorAll('.skill-group');
  gsap.set(skillGroups, { opacity: 0, y: 40 });
  ScrollTrigger.create({
    trigger: '.skills__grid',
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(skillGroups, {
        opacity: 1, y: 0,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.2,
      });
    },
  });

  /* ── Per-item stagger — Project cards ── */
  const projectCards = document.querySelectorAll('.project-card');
  gsap.set(projectCards, { opacity: 0, y: 56 });
  ScrollTrigger.create({
    trigger: '.projects__grid',
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(projectCards, {
        opacity: 1, y: 0,
        duration: 1.3,
        ease: 'power3.out',
        stagger: 0.18,
      });
    },
  });

  /* ── Per-item stagger — Contact links ── */
  const contactLinks = document.querySelectorAll('.contact-link');
  gsap.set(contactLinks, { opacity: 0, y: 32 });
  ScrollTrigger.create({
    trigger: '.contact__links',
    start: 'top 88%',
    once: true,
    onEnter: () => {
      gsap.to(contactLinks, {
        opacity: 1, y: 0,
        duration: 1.1,
        ease: 'power2.out',
        stagger: 0.15,
      });
    },
  });

  ScrollTrigger.refresh();

}); /* end document.fonts.ready */

/* ─────────────────────────────────────────────────────────
   ACTIVE NAV on scroll
───────────────────────────────────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav__link');

const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${id}`
          ? 'var(--clr-white)' : '';
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObs.observe(s));

/* ─────────────────────────────────────────────────────────
   LANGUAGE SWITCHER
   For elements that have been split into line-masks,
   reset to plain text then re-split so lines stay correct.
───────────────────────────────────────────────────────── */
const langToggle = document.getElementById('langToggle');
const labelEN    = document.getElementById('langEN');
const labelRU    = document.getElementById('langRU');
let currentLang  = localStorage.getItem('lang') || 'en';

/* elements that need full rebuild after lang switch */
const splitTargets = [
  ...document.querySelectorAll('.gsap-hero'),
  ...document.querySelectorAll('.gsap-reveal'),
];

function setLang(lang) {
  currentLang = lang;

  /* plain data-en/data-ru elements */
  document.querySelectorAll('[data-en]').forEach(el => {
    if (!el.classList.contains('gsap-hero') && !el.classList.contains('gsap-reveal')) {
      el.textContent = el.dataset[lang];
    }
  });

  /* re-split animated text elements */
  splitTargets.forEach(el => {
    const newText = el.dataset[lang];
    if (!newText) return;
    el.textContent = newText;
    const lines = splitLines(el);
    /* instantly show — already revealed */
    gsap.set(lines, { y: 0, rotation: 0 });
  });

  labelEN.classList.toggle('lang-toggle__label--active', lang === 'en');
  labelRU.classList.toggle('lang-toggle__label--active', lang === 'ru');
  document.documentElement.lang = lang;
  document.title = lang === 'ru'
    ? 'Станислав Кайдаш — Frontend Developer'
    : 'Stanislav Kaidash — Frontend Developer';
  localStorage.setItem('lang', lang);
}

langToggle.addEventListener('click', () => {
  setLang(currentLang === 'en' ? 'ru' : 'en');
});

/* apply saved language on load */
if (currentLang !== 'en') setLang(currentLang);

/* ─────────────────────────────────────────────────────────
   RESIZE — debounced re-split of all animated text
───────────────────────────────────────────────────────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    /* re-split hero elements */
    document.querySelectorAll('.gsap-hero').forEach(el => {
      const text = el.dataset[currentLang] || el.textContent.trim();
      el.textContent = text;
      const lines = splitLines(el);
      gsap.set(lines, { y: 0, rotation: 0 });
    });
    /* re-split revealed scroll elements */
    document.querySelectorAll('.gsap-reveal').forEach(el => {
      const text = el.dataset[currentLang] || el.textContent.trim();
      el.textContent = text;
      const lines = splitLines(el);
      gsap.set(lines, { y: 0, rotation: 0 });
    });
    ScrollTrigger.refresh();
  }, 250);
});
