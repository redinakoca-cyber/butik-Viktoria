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
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load

  /* ══════════════════════════════════════
     2. MOBILE MENU — open / close
  ══════════════════════════════════════ */
  function openMenu() {
    navToggle.classList.add('active');
    navLinks.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', () => {
    navToggle.classList.contains('active') ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

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
  ══════════════════════════════════════ */
  let ticking = false;

  function applyParallax() {
    if (!heroBgText) return;
    const y = window.scrollY;
    heroBgText.style.transform =
      `translate(-50%, calc(-50% + ${y * 0.22}px))`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

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
      formSubmit.textContent = 'Dërguar ✓';
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

})();