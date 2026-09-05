/**
 * NEXOIRA theme JS.
 * Vanilla, dependency-free. Every init function is idempotent (guarded
 * with a data-initialized flag) so it can safely re-run after Shopify
 * section reloads inside the theme editor.
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function formatMoney(cents, format) {
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
  }

  /* ---------------------------------------------------------------------
     Header: sticky/transparent state, shop dropdown, search panel
     ------------------------------------------------------------------ */

  function initHeaderScroll() {
    var header = document.querySelector('[data-header]');
    if (!header || header.dataset.scrollInitialized) return;
    header.dataset.scrollInitialized = 'true';

    if (!header.classList.contains('site-header--transparent')) return;

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
  }

  function closePanel(panel, trigger) {
    panel.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function openPanel(panel, trigger) {
    panel.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function initHeaderPanels() {
    var header = document.querySelector('[data-header]');
    if (!header || header.dataset.panelsInitialized) return;
    header.dataset.panelsInitialized = 'true';

    var shopTrigger = header.querySelector('[data-shop-trigger]');
    var shopDropdown = header.querySelector('[data-shop-dropdown]');
    var searchTrigger = header.querySelector('[data-search-toggle]');
    var searchPanel = header.querySelector('[data-search-panel]');

    function closeAll() {
      if (shopDropdown) closePanel(shopDropdown, shopTrigger);
      if (searchPanel) {
        closePanel(searchPanel, searchTrigger);
        document.body.classList.remove('search-open');
      }
    }

    if (shopTrigger && shopDropdown) {
      shopTrigger.addEventListener('click', function () {
        var isOpen = shopDropdown.classList.contains('is-open');
        closeAll();
        if (!isOpen) openPanel(shopDropdown, shopTrigger);
      });
    }

    if (searchTrigger && searchPanel) {
      searchTrigger.addEventListener('click', function () {
        var isOpen = searchPanel.classList.contains('is-open');
        closeAll();
        if (!isOpen) {
          openPanel(searchPanel, searchTrigger);
          document.body.classList.add('search-open');
          var input = searchPanel.querySelector('[data-search-input]');
          if (input) input.focus();
        }
      });
    }

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeAll();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
  }

  /* ---------------------------------------------------------------------
     Mobile navigation drawer
     ------------------------------------------------------------------ */

  function initMobileNav() {
    var toggle = document.querySelector('[data-mobile-nav-toggle]');
    var nav = document.querySelector('[data-mobile-nav]');
    var overlay = document.querySelector('[data-mobile-nav-overlay]');
    var closeBtn = document.querySelector('[data-mobile-nav-close]');
    if (!toggle || !nav || nav.dataset.initialized) return;
    nav.dataset.initialized = 'true';

    function open() {
      nav.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    }

    function close() {
      nav.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
  }

  /* ---------------------------------------------------------------------
     Announcement bar rotation
     ------------------------------------------------------------------ */

  function initAnnouncementBar() {
    var bar = document.querySelector('[data-announcement-bar]');
    if (!bar || bar.dataset.initialized) return;
    bar.dataset.initialized = 'true';

    var messages = Array.prototype.slice.call(bar.querySelectorAll('.announcement-bar__message'));
    if (messages.length < 2) return;
    if (prefersReducedMotion || bar.dataset.autoplay !== 'true') return;

    var interval = parseInt(bar.dataset.interval, 10) || 5000;
    var index = 0;

    setInterval(function () {
      messages[index].classList.remove('is-active');
      index = (index + 1) % messages.length;
      messages[index].classList.add('is-active');
    }, interval);
  }

  /* ---------------------------------------------------------------------
     Hero slider
     ------------------------------------------------------------------ */

  function initHeroSliders() {
    var sliders = document.querySelectorAll('[data-hero-slider]');

    sliders.forEach(function (slider) {
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
      var autoplay = slider.dataset.autoplay === 'true' && !prefersReducedMotion;

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

      function next() {
        goTo(current + 1);
      }

      function prev() {
        goTo(current - 1);
      }

      function startAutoplay() {
        if (!autoplay) return;
        stopAutoplay();
        timer = setInterval(next, interval);
      }

      function stopAutoplay() {
        if (timer) clearInterval(timer);
        timer = null;
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
  }

  /* ---------------------------------------------------------------------
     Product form: variant selection + price sync
     ------------------------------------------------------------------ */

  function initProductForms() {
    var forms = document.querySelectorAll('#ProductForm');

    forms.forEach(function (form) {
      if (form.dataset.initialized) return;
      form.dataset.initialized = 'true';

      var variantsScript = form.querySelector('[data-product-variants]');
      var variants = [];
      if (variantsScript) {
        try {
          variants = JSON.parse(variantsScript.textContent);
        } catch (error) {
          variants = [];
        }
      }
      if (!variants.length) return;

      var optionSelects = Array.prototype.slice.call(form.querySelectorAll('.product__option-select'));
      var hiddenIdInput = document.getElementById('ProductSelectedVariant');
      var addButton = form.querySelector('.product__add-to-cart');
      var priceContainer = document.querySelector('[data-product-price]');

      function selectedOptions() {
        return optionSelects
          .slice()
          .sort(function (a, b) {
            return parseInt(a.dataset.optionPosition, 10) - parseInt(b.dataset.optionPosition, 10);
          })
          .map(function (select) {
            return select.value;
          });
      }

      function findVariant() {
        var selected = selectedOptions();
        return variants.filter(function (variant) {
          return selected.every(function (value, index) {
            return variant['option' + (index + 1)] === value;
          });
        })[0];
      }

      function renderPrice(variant) {
        if (!priceContainer) return;
        var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        if (onSale) {
          priceContainer.innerHTML =
            '<span class="product__price--sale">' + formatMoney(variant.price) + '</span>' +
            '<span class="product__price--compare">' + formatMoney(variant.compare_at_price) + '</span>';
        } else {
          priceContainer.innerHTML = '<span>' + formatMoney(variant.price) + '</span>';
        }
      }

      function updateForVariant(variant) {
        if (!variant || !hiddenIdInput) return;
        hiddenIdInput.value = variant.id;
        renderPrice(variant);

        if (addButton) {
          if (variant.available) {
            addButton.removeAttribute('disabled');
            addButton.textContent = addButton.dataset.labelAvailable || addButton.textContent;
          } else {
            addButton.setAttribute('disabled', 'disabled');
            addButton.textContent = addButton.dataset.labelSoldOut || addButton.textContent;
          }
        }
      }

      optionSelects.forEach(function (select) {
        select.addEventListener('change', function () {
          updateForVariant(findVariant());
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Cart quantity guard (cart page)
     ------------------------------------------------------------------ */

  function initCartQuantities() {
    var cartForm = document.querySelector('.cart__form');
    if (!cartForm || cartForm.dataset.initialized) return;
    cartForm.dataset.initialized = 'true';

    var quantityInputs = cartForm.querySelectorAll('input[name="updates[]"]');
    quantityInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (parseInt(input.value, 10) < 0) {
          input.value = 0;
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Quick add (product cards): AJAX add for single-variant products,
     otherwise send the shopper to the product page to choose options.
     ------------------------------------------------------------------ */

  function updateCartCount() {
    fetch('/cart.js')
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {
        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
          el.textContent = cart.item_count;
        });
      })
      .catch(function () {});
  }

  function initQuickAdd() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-quick-add]');
      if (!button || button.dataset.loading) return;

      if (button.dataset.singleVariant !== 'true') {
        window.location.href = button.dataset.productUrl;
        return;
      }

      event.preventDefault();
      var originalText = button.textContent;
      button.dataset.loading = 'true';
      button.setAttribute('data-loading', 'true');
      button.textContent = '…';

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: button.dataset.variantId, quantity: 1 })
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Add to cart failed');
          return response.json();
        })
        .then(function () {
          button.textContent = 'Added';
          updateCartCount();
          setTimeout(function () {
            button.textContent = originalText;
            button.removeAttribute('data-loading');
            delete button.dataset.loading;
          }, 1600);
        })
        .catch(function () {
          button.textContent = 'Try again';
          setTimeout(function () {
            button.textContent = originalText;
            button.removeAttribute('data-loading');
            delete button.dataset.loading;
          }, 1600);
        });
    });
  }

  /* ---------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  function initAll() {
    initHeaderScroll();
    initHeaderPanels();
    initMobileNav();
    initAnnouncementBar();
    initHeroSliders();
    initProductForms();
    initCartQuantities();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll();
    initQuickAdd();
  });

  document.addEventListener('shopify:section:load', initAll);
})();
