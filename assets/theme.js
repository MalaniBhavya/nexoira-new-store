/**
 * NEXOIRA — core theme JS.
 *
 * Vanilla and dependency-free. This file owns the shared namespace and the
 * global chrome (header, navigation, announcement bar, hero, motion).
 * Feature modules live in their own assets and attach themselves through
 * Nexoira.register(), which runs the init once now and again after every
 * Shopify section reload in the theme editor.
 *
 * Every init must be idempotent — guard with a data-* flag on the element
 * it owns, because initAll() runs repeatedly.
 */

window.Nexoira = window.Nexoira || {};

(function (Nexoira) {
  'use strict';

  var modules = [];

  Nexoira.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Nexoira.settings = window.theme || {};

  /**
   * Register a feature init. Runs immediately if the DOM is already
   * parsed, and on every subsequent initAll().
   */
  Nexoira.register = function (fn) {
    modules.push(fn);
    if (document.readyState !== 'loading') run(fn);
  };

  function run(fn) {
    try {
      fn();
    } catch (error) {
      /* One broken module must never take the rest of the page with it. */
      if (window.console && console.warn) console.warn('[nexoira]', error);
    }
  }

  Nexoira.initAll = function () {
    modules.forEach(run);
  };

  /**
   * Attach a delegated document listener exactly once, however many times
   * initAll() runs.
   */
  Nexoira.once = function (key, fn) {
    var flag = 'nexoira' + key;
    if (document.body.dataset[flag]) return;
    document.body.dataset[flag] = 'true';
    fn();
  };

  /* ---------------------------------------------------------------------
     Money formatting (mirrors Shopify's money_format token syntax)
     ------------------------------------------------------------------ */

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = typeof precision === 'undefined' ? 2 : precision;
    thousands = typeof thousands === 'undefined' ? ',' : thousands;
    decimal = typeof decimal === 'undefined' ? '.' : decimal;

    if (isNaN(number) || number == null) return 0;

    number = (number / 100.0).toFixed(precision);

    var parts = number.split('.');
    var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var cents = parts[1] ? decimal + parts[1] : '';

    return dollars + cents;
  }

  Nexoira.formatMoney = function (cents, format) {
    format = format || window.themeMoneyFormat || '₹{{amount}}';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var match = format.match(placeholderRegex);
    if (!match) return format;

    var value;
    switch (match[1]) {
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      default:
        value = formatWithDelimiters(cents, 2);
    }

    return format.replace(placeholderRegex, value);
  };

  /** Escape a string for safe insertion into innerHTML. */
  Nexoira.escapeHtml = function (value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  };

  /**
   * Trap Tab inside an open drawer/dialog and restore focus on close.
   * Returns a release() function.
   */
  Nexoira.trapFocus = function (container, returnFocusTo) {
    var selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

    function onKeydown(event) {
      if (event.key !== 'Tab') return;
      var focusable = Array.prototype.slice
        .call(container.querySelectorAll(selector))
        .filter(function (el) {
          return el.offsetParent !== null;
        });
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeydown);

    return function release() {
      document.removeEventListener('keydown', onKeydown);
      if (returnFocusTo && typeof returnFocusTo.focus === 'function') returnFocusTo.focus();
    };
  };

  /* ---------------------------------------------------------------------
     Header: sticky/transparent state
     ------------------------------------------------------------------ */

  Nexoira.register(function initHeaderScroll() {
    var header = document.querySelector('[data-header]');
    if (!header || header.dataset.scrollInitialized) return;
    header.dataset.scrollInitialized = 'true';

    var ticking = false;

    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  });

  /* ---------------------------------------------------------------------
     Header search panel
     ------------------------------------------------------------------ */

  Nexoira.register(function initHeaderSearchPanel() {
    var header = document.querySelector('[data-header]');
    if (!header || header.dataset.panelsInitialized) return;
    header.dataset.panelsInitialized = 'true';

    var trigger = header.querySelector('[data-search-toggle]');
    var panel = header.querySelector('[data-search-panel]');
    if (!trigger || !panel) return;

    function close() {
      panel.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('search-open');
    }

    trigger.addEventListener('click', function () {
      var isOpen = panel.classList.contains('is-open');
      if (isOpen) {
        close();
        return;
      }
      panel.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('search-open');
      var input = panel.querySelector('[data-predictive-search-input]');
      if (input) input.focus();
    });

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        close();
        trigger.focus();
      }
    });
  });

  /* ---------------------------------------------------------------------
     Desktop navigation: dropdowns and mega menus.

     Hover opens on pointer devices via CSS. This handles the keyboard and
     touch paths: the trigger is a real link, so a first tap/Enter opens
     the panel and a second follows the link.
     ------------------------------------------------------------------ */

  Nexoira.register(function initHeaderNav() {
    var nav = document.querySelector('.site-header__nav');
    if (!nav || nav.dataset.initialized) return;
    nav.dataset.initialized = 'true';

    var items = Array.prototype.slice.call(nav.querySelectorAll('[data-nav-item]'));
    if (!items.length) return;

    function closeAll(except) {
      items.forEach(function (item) {
        if (item === except) return;
        item.classList.remove('is-open');
        var trigger = item.querySelector('[data-nav-trigger]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }

    items.forEach(function (item) {
      var trigger = item.querySelector('[data-nav-trigger]');
      if (!trigger) return;

      trigger.addEventListener('click', function (event) {
        /* Only intercept the first activation; once open the link works. */
        if (item.classList.contains('is-open')) return;
        event.preventDefault();
        closeAll(item);
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });

      item.addEventListener('focusout', function (event) {
        if (!item.contains(event.relatedTarget)) {
          item.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });

    nav.addEventListener('mouseleave', function () {
      closeAll(null);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll(null);
    });
  });

  /* ---------------------------------------------------------------------
     Mobile navigation drawer
     ------------------------------------------------------------------ */

  Nexoira.register(function initMobileNav() {
    var toggle = document.querySelector('[data-mobile-nav-toggle]');
    var nav = document.querySelector('[data-mobile-nav]');
    if (!toggle || !nav || nav.dataset.initialized) return;
    nav.dataset.initialized = 'true';

    var overlay = document.querySelector('[data-mobile-nav-overlay]');
    var closeBtn = nav.querySelector('[data-mobile-nav-close]');
    var releaseFocus = null;

    function open() {
      nav.classList.add('is-open');
      nav.setAttribute('aria-hidden', 'false');
      if (overlay) overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
      if (closeBtn) closeBtn.focus();
      releaseFocus = Nexoira.trapFocus(nav, toggle);
    }

    function close() {
      if (!nav.classList.contains('is-open')) return;
      nav.classList.remove('is-open');
      nav.setAttribute('aria-hidden', 'true');
      if (overlay) overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
      if (releaseFocus) {
        releaseFocus();
        releaseFocus = null;
      }
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
  });

  /* ---------------------------------------------------------------------
     Announcement bar rotation
     ------------------------------------------------------------------ */

  Nexoira.register(function initAnnouncementBar() {
    var bar = document.querySelector('[data-announcement-bar]');
    if (!bar || bar.dataset.initialized) return;
    bar.dataset.initialized = 'true';

    var messages = Array.prototype.slice.call(bar.querySelectorAll('.announcement-bar__message'));
    if (messages.length < 2) return;
    if (Nexoira.prefersReducedMotion || bar.dataset.autoplay !== 'true') return;

    var interval = parseInt(bar.dataset.interval, 10) || 5000;
    var index = 0;

    setInterval(function () {
      messages[index].classList.remove('is-active');
      index = (index + 1) % messages.length;
      messages[index].classList.add('is-active');
    }, interval);
  });

  /* ---------------------------------------------------------------------
     Hero slider
     ------------------------------------------------------------------ */

  Nexoira.register(function initHeroSliders() {
    document.querySelectorAll('[data-hero-slider]').forEach(function (slider) {
      if (slider.dataset.initialized) return;
      slider.dataset.initialized = 'true';

      var slides = Array.prototype.slice.call(slider.querySelectorAll('[data-hero-slide]'));
      var prevBtn = slider.querySelector('[data-hero-prev]');
      var nextBtn = slider.querySelector('[data-hero-next]');
      var dots = Array.prototype.slice.call(slider.querySelectorAll('[data-hero-dot]'));
      if (slides.length < 2) return;

      var current = 0;
      var timer = null;
      var interval = parseInt(slider.dataset.interval, 10) || 6000;
      var autoplay = slider.dataset.autoplay === 'true' && !Nexoira.prefersReducedMotion;

      function goTo(index) {
        slides[current].classList.remove('is-active');
        slides[current].setAttribute('aria-hidden', 'true');
        if (dots[current]) {
          dots[current].classList.remove('is-active');
          dots[current].setAttribute('aria-selected', 'false');
        }

        current = (index + slides.length) % slides.length;

        slides[current].classList.add('is-active');
        slides[current].removeAttribute('aria-hidden');
        if (dots[current]) {
          dots[current].classList.add('is-active');
          dots[current].setAttribute('aria-selected', 'true');
        }
      }

      function next() { goTo(current + 1); }
      function prev() { goTo(current - 1); }

      function stopAutoplay() {
        if (timer) clearInterval(timer);
        timer = null;
      }

      function startAutoplay() {
        if (!autoplay) return;
        stopAutoplay();
        timer = setInterval(next, interval);
      }

      if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAutoplay(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAutoplay(); });
      dots.forEach(function (dot, index) {
        dot.addEventListener('click', function () { goTo(index); startAutoplay(); });
      });

      slider.addEventListener('mouseenter', stopAutoplay);
      slider.addEventListener('mouseleave', startAutoplay);
      slider.addEventListener('focusin', stopAutoplay);
      slider.addEventListener('focusout', startAutoplay);

      var touchStartX = null;
      slider.addEventListener('touchstart', function (event) {
        touchStartX = event.touches[0].clientX;
        stopAutoplay();
      }, { passive: true });

      slider.addEventListener('touchend', function (event) {
        if (touchStartX === null) return;
        var deltaX = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 40) {
          if (deltaX < 0) next();
          else prev();
        }
        touchStartX = null;
        startAutoplay();
      });

      startAutoplay();
    });
  });

  /* ---------------------------------------------------------------------
     Login / recover password toggle. Shopify redirects back to #recover
     after a recovery submission, so the hash alone decides the panel.
     ------------------------------------------------------------------ */

  Nexoira.register(function initAuthForms() {
    var wrapper = document.querySelector('[data-auth-toggle]');
    if (!wrapper || wrapper.dataset.initialized) return;
    wrapper.dataset.initialized = 'true';

    var loginPanel = wrapper.querySelector('[data-login-panel]');
    var recoverPanel = wrapper.querySelector('[data-recover-panel]');
    if (!loginPanel || !recoverPanel) return;

    function showRecover() {
      loginPanel.hidden = true;
      recoverPanel.hidden = false;
    }

    function showLogin() {
      recoverPanel.hidden = true;
      loginPanel.hidden = false;
    }

    if (window.location.hash === '#recover') showRecover();

    wrapper.addEventListener('click', function (event) {
      if (event.target.closest('[data-recover-toggle]')) {
        event.preventDefault();
        showRecover();
      }
      if (event.target.closest('[data-recover-cancel]')) {
        event.preventDefault();
        showLogin();
      }
    });
  });

  /* ---------------------------------------------------------------------
     Scroll reveal: one shared IntersectionObserver drives every
     [data-reveal] element (see base.css "Motion system"). Elements are
     marked bound once observed, so repeated initAll() calls never
     re-observe. Falls back to revealing everything if anything throws —
     content must never be stuck invisible.
     ------------------------------------------------------------------ */

  var revealObserver = null;

  Nexoira.register(function initScrollReveal() {
    try {
      var items = Array.prototype.slice.call(
        document.querySelectorAll('[data-reveal]:not([data-reveal-bound])')
      );
      if (!items.length) return;

      if (Nexoira.prefersReducedMotion || !('IntersectionObserver' in window)) {
        items.forEach(function (el) {
          el.dataset.revealBound = 'true';
          el.classList.add('is-revealed');
        });
        return;
      }

      if (!revealObserver) {
        revealObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                revealObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
        );
      }

      items.forEach(function (el) {
        el.dataset.revealBound = 'true';
        revealObserver.observe(el);
      });
    } catch (error) {
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }
  });

  /* ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', Nexoira.initAll);
  document.addEventListener('shopify:section:load', Nexoira.initAll);
})(window.Nexoira);
