/* Small shared utilities used by multiple sections (mobile drawer, quick
   view, quick add, size chart, cart drawer...). Loaded once, globally,
   since Shopify's {% javascript %} tag only scopes to one section and
   these patterns repeat across many. */

window.Nexoira = window.Nexoira || {};

/**
 * Traps Tab focus inside `container` and wires Escape to `onEscape`.
 * Focuses the first focusable element immediately.
 * Returns a release() function that removes the keydown listener.
 */
Nexoira.trapFocus = function (container, options) {
  options = options || {};

  function getFocusable() {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && options.onEscape) {
      options.onEscape();
      return;
    }
    if (e.key !== 'Tab') return;

    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handleKeydown);

  var focusable = getFocusable();
  if (options.initialFocus) {
    options.initialFocus.focus();
  } else if (focusable[0]) {
    focusable[0].focus();
  }

  return function release() {
    container.removeEventListener('keydown', handleKeydown);
  };
};

/** Locks body scroll (for drawers/modals). Returns an unlock() function. */
Nexoira.lockScroll = function () {
  var scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + scrollY + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';

  return function unlock() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, scrollY);
  };
};

/** True when the viewer has asked for reduced motion. */
Nexoira.prefersReducedMotion = function () {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/** Formats a price already in rupees (not paise) as ₹ with Indian digit grouping. */
Nexoira.formatMoney = function (rupees) {
  return '₹' + Number(rupees).toLocaleString('en-IN');
};
