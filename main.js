/* ════════════════════════════════════════════
   VICTORIA BOUTIQUE — main.js
   ════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── COPYRIGHT YEAR ─── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ─── DOM REFS ─── */
  const nav           = document.getElementById('main-nav');
  const navToggle     = document.getElementById('nav-toggle');
  const navLinks      = document.getElementById('nav-links');
  const overlay       = document.getElementById('mobile-overlay');
  const allNavLinks   = document.querySelectorAll('.nav-link');
  const heroBgText    = document.querySelector('.hero-bg-text');
  const heroVideo     = document.querySelector('.hero-video');
  const revealEls     = document.querySelectorAll('.reveal');
  const formSubmit    = document.getElementById('form-submit');
  const formSuccess   = document.getElementById('form-success');
  const nameInput     = document.getElementById('name');
  const phoneInput    = document.getElementById('phone');
  const messageInput  = document.getElementById('message');

  /* ══════════════════════════════════════
     1. NAV — scroll style
  ══════════════════════════════════════ */
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load

  /* ══════════════════════════════════════
     2. MOBILE MENU — open / close
     Guarded: a page without the nav markup used to throw here and kill
     every feature below it, including the floating WhatsApp button.
  ══════════════════════════════════════ */
  function openMenu() {
    if (!navToggle || !navLinks || !overlay) return;
    navToggle.classList.add('active');
    navLinks.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!navToggle || !navLinks || !overlay) return;
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.contains('active') ? closeMenu() : openMenu();
    });
  }

  if (overlay) overlay.addEventListener('click', closeMenu);

  // Close menu when a nav link is clicked
  allNavLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ══════════════════════════════════════
     3. HERO PARALLAX — bg text
     Writes ONLY the offset as a custom property. CSS owns the transform,
     so the ghost wordmark can be repositioned per breakpoint without the
     first scroll event clobbering it.
  ══════════════════════════════════════ */
  let ticking = false;

  function applyParallax() {
    if (heroBgText) {
      heroBgText.style.setProperty('--parallax', (window.scrollY * 0.22) + 'px');
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

  /* ══════════════════════════════════════
     3b. HERO VIDEO — pause when off-screen
     The homepage is mostly below the fold; decoding a looping video the
     visitor cannot see burns battery and mobile data for nothing.
  ══════════════════════════════════════ */
  if (heroVideo && 'IntersectionObserver' in window) {
    const playSafely = () => {
      const p = heroVideo.play();
      // A rejected autoplay promise is normal (iOS Low Power Mode), not an error.
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) playSafely();
        else heroVideo.pause();
      });
    }, { threshold: 0.05 }).observe(heroVideo);

    // Also stop when the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) heroVideo.pause();
      else if (heroVideo.getBoundingClientRect().bottom > 0) playSafely();
    });
  }

  /* ══════════════════════════════════════
     4. SCROLL REVEAL
  ══════════════════════════════════════ */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        // Stagger siblings in the same parent
        const siblings = [
          ...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')
        ];
        const idx = siblings.indexOf(entry.target);
        const delay = Math.max(0, idx * 110);

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  /* ══════════════════════════════════════
     5. SMOOTH SCROLL for anchor links
     (supplement to CSS scroll-behavior for
      browsers that need JS fallback)
  ══════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--nav-h')) || 68;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ══════════════════════════════════════
     6. CONTACT FORM — basic validation
  ══════════════════════════════════════ */
  if (formSubmit) {
    formSubmit.addEventListener('click', () => {
      const name    = nameInput    ? nameInput.value.trim()    : '';
      const phone   = phoneInput   ? phoneInput.value.trim()   : '';
      const message = messageInput ? messageInput.value.trim() : '';

      // Simple presence validation
      if (!name) {
        shake(nameInput);
        nameInput.focus();
        return;
      }
      if (!phone) {
        shake(phoneInput);
        phoneInput.focus();
        return;
      }
      if (!message) {
        shake(messageInput);
        messageInput.focus();
        return;
      }

      // Success state
      formSubmit.disabled = true;
      // label comes from data-sent-label so translated pages (/en/…) can localize it
      formSubmit.textContent = formSubmit.dataset.sentLabel || 'Dërguar';
      formSubmit.style.background = 'var(--gold)';

      if (formSuccess) {
        formSuccess.classList.add('visible');
      }

      // Clear fields after a beat
      setTimeout(() => {
        if (nameInput)    nameInput.value    = '';
        if (phoneInput)   phoneInput.value   = '';
        if (messageInput) messageInput.value = '';
      }, 600);
    });
  }

  /* Shake animation for invalid fields */
  function shake(el) {
    if (!el) return;
    el.style.transition = 'border-color 0.3s';
    el.style.borderBottomColor = '#C0392B';
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 350, easing: 'ease-out' }
    );
    setTimeout(() => {
      el.style.borderBottomColor = '';
    }, 1200);
  }

  /* ══════════════════════════════════════
     7. COLLECTION CARD — touch ripple
        (subtle gold pulse on tap, mobile)
  ══════════════════════════════════════ */
  document.querySelectorAll('.collection-card').forEach((card) => {
    card.addEventListener('pointerdown', function (e) {
      const ripple = document.createElement('span');
      const rect   = card.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 1.5;
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        left: ${e.clientX - rect.left - size / 2}px;
        top: ${e.clientY - rect.top  - size / 2}px;
        background: rgba(201,168,76,0.12);
        border-radius: 50%;
        transform: scale(0);
        animation: rippleAnim 0.55s ease-out forwards;
        pointer-events: none;
        z-index: 3;
      `;
      card.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  // Inject ripple keyframe once
  if (!document.getElementById('ripple-style')) {
    const s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = `
      @keyframes rippleAnim {
        to { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════
     8. FLOATING WHATSAPP BUTTON + A11Y
        Injected globally so every page gets it (and styles.css stays untouched).
        Localised by <html lang>. Respects reduced motion.
  ══════════════════════════════════════ */
  (function () {
    const WA = 'https://wa.me/355695557373';
    const lang = (document.documentElement.lang || 'sq').slice(0, 2);
    const T = {
      sq: { label: 'Na shkruani në WhatsApp', text: 'Përshëndetje Victoria Boutique!' },
      en: { label: 'Message us on WhatsApp',   text: 'Hello Victoria Boutique!' },
      it: { label: 'Scrivici su WhatsApp',     text: 'Salve Victoria Boutique!' },
    };
    const t = T[lang] || T.sq;

    // one-time styles (self-contained; no edit to styles.css)
    if (!document.getElementById('vb-extras-style')) {
      const st = document.createElement('style');
      st.id = 'vb-extras-style';
      st.textContent = `
        .wa-float{position:fixed;right:18px;bottom:18px;z-index:120;width:58px;height:58px;
          border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 24px rgba(0,0,0,.22);transition:transform .25s ease,box-shadow .25s ease;
          animation:waPop .4s .6s both;-webkit-tap-highlight-color:transparent}
        .wa-float svg{width:32px;height:32px;fill:#fff}
        .wa-float:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 12px 30px rgba(0,0,0,.28)}
        .wa-float:focus-visible{outline:3px solid #fff;outline-offset:3px}
        @keyframes waPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        .vb-skip{position:absolute;left:-999px;top:0;z-index:300;background:#1A1A18;color:#fff;
          padding:.7rem 1.1rem;border-radius:0 0 6px 0;font:600 .8rem/1 'Jost',sans-serif;letter-spacing:.05em}
        .vb-skip:focus{left:0}
        @media (max-width:520px){.wa-float{width:52px;height:52px;right:14px;bottom:14px}.wa-float svg{width:28px;height:28px}}
        @media (prefers-reduced-motion:reduce){
          *,::before,::after{animation-duration:.001ms!important;animation-iteration-count:1!important;
            transition-duration:.001ms!important;scroll-behavior:auto!important}
        }
      `;
      document.head.appendChild(st);
    }

    // skip-to-content link (a11y) — points at the first landmark
    if (!document.querySelector('.vb-skip')) {
      const main = document.querySelector('main, section');
      if (main) {
        if (!main.id) main.id = 'vb-main';
        const skip = document.createElement('a');
        skip.className = 'vb-skip';
        skip.href = '#' + main.id;
        skip.textContent = lang === 'it' ? 'Vai al contenuto' : lang === 'en' ? 'Skip to content' : 'Kalo te përmbajtja';
        document.body.insertBefore(skip, document.body.firstChild);
      }
    }

    // floating WhatsApp button
    if (!document.querySelector('.wa-float')) {
      const a = document.createElement('a');
      a.className = 'wa-float';
      a.href = WA + '?text=' + encodeURIComponent(t.text);
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', t.label);
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.719zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
      document.body.appendChild(a);
    }
  })();

})();