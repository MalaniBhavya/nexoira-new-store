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

      var hiddenIdInput = form.querySelector('#ProductSelectedVariant');
      var addButton = form.querySelector('.product__add-to-cart');
      var priceContainer = document.querySelector('[data-product-price]');

      /* Variant matching only applies when the product has more than
         one variant and therefore ships an options → variants map. */
      var variantsScript = form.querySelector('[data-product-variants]');
      var variants = [];
      if (variantsScript) {
        try {
          variants = JSON.parse(variantsScript.textContent);
        } catch (error) {
          variants = [];
        }
      }

      if (variants.length) {
        var optionInputs = Array.prototype.slice.call(form.querySelectorAll('.product__option-input'));
        var positions = [];
        optionInputs.forEach(function (input) {
          if (positions.indexOf(input.dataset.optionPosition) === -1) {
            positions.push(input.dataset.optionPosition);
          }
        });
        positions.sort(function (a, b) {
          return parseInt(a, 10) - parseInt(b, 10);
        });

        var selectedOptions = function () {
          return positions.map(function (pos) {
            var checked = form.querySelector('.product__option-input[data-option-position="' + pos + '"]:checked');
            return checked ? checked.value : null;
          });
        };

        var findVariant = function () {
          var selected = selectedOptions();
          return variants.filter(function (variant) {
            return selected.every(function (value, index) {
              return variant['option' + (index + 1)] === value;
            });
          })[0];
        };

        var renderPrice = function (variant) {
          if (!priceContainer) return;
          var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
          if (onSale) {
            priceContainer.innerHTML =
              '<span class="product__price--sale">' + formatMoney(variant.price) + '</span>' +
              '<span class="product__price--compare">' + formatMoney(variant.compare_at_price) + '</span>';
          } else {
            priceContainer.innerHTML = '<span>' + formatMoney(variant.price) + '</span>';
          }
        };

        var updateForVariant = function (variant) {
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
        };

        optionInputs.forEach(function (input) {
          input.addEventListener('change', function () {
            var pos = input.dataset.optionPosition;
            form.querySelectorAll('.product__option-input[data-option-position="' + pos + '"]').forEach(function (sibling) {
              var label = sibling.closest('label');
              if (label) label.classList.toggle('is-selected', sibling.checked);
            });

            var group = input.closest('.product__option');
            var valueDisplay = group ? group.querySelector('.product__option-label strong') : null;
            if (valueDisplay) valueDisplay.textContent = input.value;

            updateForVariant(findVariant());
          });
        });
      }

      /* AJAX add-to-cart applies to every product form, single or
         multi-variant, so the drawer opens instead of a full navigation. */
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!addButton || addButton.hasAttribute('disabled') || addButton.dataset.loading) return;

        var originalText = addButton.textContent;
        var quantityField = form.querySelector('[name="quantity"]');
        var idField = hiddenIdInput || form.querySelector('[name="id"]');
        addButton.dataset.loading = 'true';
        addButton.setAttribute('disabled', 'disabled');
        addButton.textContent = '…';

        cartRequest('/cart/add.js', {
          id: idField.value,
          quantity: parseInt(quantityField ? quantityField.value : 1, 10) || 1
        })
          .then(function (data) {
            applyCartResponse(data);
            openCartDrawer();
            addButton.textContent = originalText;
            addButton.removeAttribute('disabled');
            delete addButton.dataset.loading;
          })
          .catch(function () {
            addButton.textContent = 'Try again';
            addButton.removeAttribute('disabled');
            delete addButton.dataset.loading;
            setTimeout(function () {
              addButton.textContent = originalText;
            }, 1600);
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
     Cart drawer: open/close + AJAX mutations via the cart endpoints'
     native `sections` rendering parameter, so the drawer markup is
     always server-rendered Liquid, never duplicated in JS.
     ------------------------------------------------------------------ */

  var CART_DRAWER_SECTION = 'cart-drawer';

  function updateCartCount(itemCount) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = itemCount;
    });
  }

  function replaceCartDrawerMarkup(sectionHtml) {
    if (!sectionHtml) return;
    var parser = new DOMParser();
    var doc = parser.parseFromString(sectionHtml, 'text/html');
    var freshDrawer = doc.querySelector('[data-cart-drawer]');
    var freshOverlay = doc.querySelector('[data-cart-drawer-overlay]');
    var currentDrawer = document.querySelector('[data-cart-drawer]');
    var currentOverlay = document.querySelector('[data-cart-drawer-overlay]');

    if (freshDrawer && currentDrawer) {
      var wasOpen = currentDrawer.classList.contains('is-open');
      currentDrawer.replaceWith(freshDrawer);
      if (wasOpen) {
        freshDrawer.classList.add('is-open');
        freshDrawer.setAttribute('aria-hidden', 'false');
      }
    }
    if (freshOverlay && currentOverlay) {
      var overlayWasOpen = currentOverlay.classList.contains('is-open');
      currentOverlay.replaceWith(freshOverlay);
      if (overlayWasOpen) freshOverlay.classList.add('is-open');
    }
  }

  function openCartDrawer() {
    var drawer = document.querySelector('[data-cart-drawer]');
    var overlay = document.querySelector('[data-cart-drawer-overlay]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('is-open');
    document.body.classList.add('cart-drawer-open');
    var closeBtn = drawer.querySelector('[data-cart-drawer-close]');
    if (closeBtn) closeBtn.focus();
  }

  function closeCartDrawer() {
    var drawer = document.querySelector('[data-cart-drawer]');
    var overlay = document.querySelector('[data-cart-drawer-overlay]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('cart-drawer-open');
  }

  function cartRequest(url, body) {
    body = body || {};
    body.sections = CART_DRAWER_SECTION;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      if (!response.ok) throw new Error('Cart request failed');
      return response.json();
    });
  }

  function applyCartResponse(data) {
    /* /cart/add.js resolves with the added line item, not the cart, so
       it has no item_count field — /cart/change.js and /cart/update.js
       DO include one. Rather than branch on which endpoint was called,
       always read the count back off the freshly re-rendered drawer,
       which Liquid renders correctly from `cart.item_count` either way. */
    if (data.sections && data.sections[CART_DRAWER_SECTION]) {
      replaceCartDrawerMarkup(data.sections[CART_DRAWER_SECTION]);
    }
    var drawer = document.querySelector('[data-cart-drawer]');
    if (drawer && typeof drawer.dataset.cartItemCount !== 'undefined') {
      updateCartCount(drawer.dataset.cartItemCount);
    }
  }

  function initCartDrawerInteractions() {
    if (document.body.dataset.cartDrawerInitialized) return;
    document.body.dataset.cartDrawerInitialized = 'true';

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-cart-drawer-open]')) {
        event.preventDefault();
        openCartDrawer();
        return;
      }

      if (event.target.closest('[data-cart-drawer-close]')) {
        event.preventDefault();
        closeCartDrawer();
        return;
      }

      var qtyButton = event.target.closest('[data-cart-qty]');
      if (qtyButton) {
        var item = qtyButton.closest('.cart-drawer__item');
        var valueEl = item ? item.querySelector('.cart-drawer__qty-value') : null;
        var current = valueEl ? parseInt(valueEl.textContent, 10) : 0;
        var next = qtyButton.dataset.cartQty === 'increase' ? current + 1 : current - 1;
        cartRequest('/cart/change.js', { line: parseInt(qtyButton.dataset.line, 10), quantity: Math.max(next, 0) })
          .then(applyCartResponse)
          .catch(function () {});
        return;
      }

      var removeButton = event.target.closest('[data-cart-remove]');
      if (removeButton) {
        cartRequest('/cart/change.js', { line: parseInt(removeButton.dataset.line, 10), quantity: 0 })
          .then(applyCartResponse)
          .catch(function () {});
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeCartDrawer();
    });
  }

  /* ---------------------------------------------------------------------
     Quick add (product cards): AJAX add for single-variant products,
     otherwise send the shopper to the product page to choose options.
     ------------------------------------------------------------------ */

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
      button.textContent = '…';

      cartRequest('/cart/add.js', { id: button.dataset.variantId, quantity: 1 })
        .then(function (data) {
          button.textContent = 'Added';
          applyCartResponse(data);
          openCartDrawer();
          setTimeout(function () {
            button.textContent = originalText;
            delete button.dataset.loading;
          }, 1600);
        })
        .catch(function () {
          button.textContent = 'Try again';
          setTimeout(function () {
            button.textContent = originalText;
            delete button.dataset.loading;
          }, 1600);
        });
    });
  }

  /* ---------------------------------------------------------------------
     Collection filter drawer + AJAX filtering/sorting (native Shopify
     filters via collection.filters — no app dependency assumed; the
     drawer simply doesn't render when a collection has none).
     ------------------------------------------------------------------ */

  function openFilterDrawer(root) {
    var drawer = root.querySelector('[data-filter-drawer]');
    var overlay = root.querySelector('[data-filter-drawer-overlay]');
    var trigger = root.querySelector('[data-filter-drawer-open]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('filter-drawer-open');
  }

  function closeFilterDrawer(root) {
    var drawer = root.querySelector('[data-filter-drawer]');
    var overlay = root.querySelector('[data-filter-drawer-overlay]');
    var trigger = root.querySelector('[data-filter-drawer-open]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('filter-drawer-open');
  }

  function initCollectionFilters() {
    var root = document.querySelector('[data-collection-section-root]');
    if (!root || root.dataset.filtersInitialized) return;
    root.dataset.filtersInitialized = 'true';

    var sectionId = root.dataset.sectionFetchId;

    function updateFromUrl(url) {
      var separator = url.indexOf('?') > -1 ? '&' : '?';
      root.classList.add('is-loading');

      fetch(url + separator + 'section_id=' + sectionId)
        .then(function (response) {
          return response.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var freshRoot = doc.querySelector('[data-collection-section-root]');
          if (freshRoot) {
            root.innerHTML = freshRoot.innerHTML;
            root.classList.remove('is-loading');
            window.history.pushState({}, '', url);
            window.scrollTo({ top: root.offsetTop - 100, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }
        })
        .catch(function () {
          window.location.href = url;
        });
    }

    function buildUrlFromFilterForm(form) {
      var params = new URLSearchParams(new FormData(form));
      var sortSelect = root.querySelector('[data-collection-sort]');
      if (sortSelect && sortSelect.value) params.set('sort_by', sortSelect.value);
      return window.location.pathname + '?' + params.toString();
    }

    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-filter-drawer-open]')) {
        openFilterDrawer(root);
        return;
      }
      if (event.target.closest('[data-filter-drawer-close]') || event.target.closest('[data-filter-drawer-overlay]')) {
        closeFilterDrawer(root);
        return;
      }

      var link = event.target.closest('a');
      if (!link) return;
      if (
        link.closest('.filter-pill') ||
        link.closest('.collection-active-filters__clear') ||
        link.closest('.pagination') ||
        link.closest('.collection__empty')
      ) {
        event.preventDefault();
        closeFilterDrawer(root);
        updateFromUrl(link.getAttribute('href'));
      }
    });

    root.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-filter-form]');
      if (!form) return;
      event.preventDefault();
      closeFilterDrawer(root);
      updateFromUrl(buildUrlFromFilterForm(form));
    });

    root.addEventListener('change', function (event) {
      if (event.target.matches('[data-collection-sort]')) {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', event.target.value);
        updateFromUrl(url.pathname + '?' + url.searchParams.toString());
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeFilterDrawer(root);
    });

    window.addEventListener('popstate', function () {
      updateFromUrl(window.location.href);
    });
  }

  /* ---------------------------------------------------------------------
     Product gallery: thumbnail navigation + swipe
     ------------------------------------------------------------------ */

  function initProductGallery() {
    var galleries = document.querySelectorAll('[data-product-gallery]');

    galleries.forEach(function (gallery) {
      if (gallery.dataset.initialized) return;
      gallery.dataset.initialized = 'true';

      var slides = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
      var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-thumb]'));
      var main = gallery.querySelector('[data-gallery-main]');
      if (slides.length < 2) return;

      function goTo(index) {
        index = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle('is-active', i === index);
        });
        thumbs.forEach(function (thumb, i) {
          thumb.classList.toggle('is-active', i === index);
        });
      }

      thumbs.forEach(function (thumb, index) {
        thumb.addEventListener('click', function () {
          goTo(index);
        });
      });

      if (main) {
        var touchStartX = null;
        main.addEventListener('touchstart', function (event) {
          touchStartX = event.touches[0].clientX;
        }, { passive: true });

        main.addEventListener('touchend', function (event) {
          if (touchStartX === null) return;
          var deltaX = event.changedTouches[0].clientX - touchStartX;
          var current = slides.findIndex(function (slide) {
            return slide.classList.contains('is-active');
          });
          if (Math.abs(deltaX) > 40) {
            goTo(deltaX < 0 ? current + 1 : current - 1);
          }
          touchStartX = null;
        });
      }
    });
  }

  /* ---------------------------------------------------------------------
     Product image zoom (native <dialog>)
     ------------------------------------------------------------------ */

  function initProductZoom() {
    var dialog = document.querySelector('[data-zoom-dialog]');
    if (!dialog || dialog.dataset.initialized) return;
    dialog.dataset.initialized = 'true';

    var image = dialog.querySelector('[data-zoom-image]');
    var closeBtn = dialog.querySelector('[data-zoom-close]');

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-zoom-trigger]');
      if (!trigger) return;
      image.src = trigger.dataset.zoomSrc;
      image.alt = trigger.dataset.zoomAlt || '';
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  /* ---------------------------------------------------------------------
     Quantity stepper (product page)
     ------------------------------------------------------------------ */

  function initQuantitySteppers() {
    document.addEventListener('click', function (event) {
      var decrease = event.target.closest('[data-quantity-decrease]');
      var increase = event.target.closest('[data-quantity-increase]');
      if (!decrease && !increase) return;

      var stepper = (decrease || increase).closest('.product__quantity-stepper');
      var input = stepper ? stepper.querySelector('input[type="number"]') : null;
      if (!input) return;

      var value = parseInt(input.value, 10) || 1;
      var min = parseInt(input.min, 10) || 1;
      value = decrease ? Math.max(min, value - 1) : value + 1;
      input.value = value;
    });
  }

  /* ---------------------------------------------------------------------
     Product recommendations (native recommendations endpoint)
     ------------------------------------------------------------------ */

  function initProductRecommendations() {
    var mount = document.querySelector('[data-product-recommendations]');
    if (!mount || mount.dataset.initialized) return;
    mount.dataset.initialized = 'true';

    fetch(mount.dataset.url)
      .then(function (response) {
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var section = doc.querySelector('.product-recommendations');
        if (section) mount.innerHTML = section.outerHTML;
      })
      .catch(function () {});
  }

  /* ---------------------------------------------------------------------
     Recently viewed (localStorage, no extra network requests)
     ------------------------------------------------------------------ */

  var RECENTLY_VIEWED_KEY = 'nexoira:recently-viewed';
  var RECENTLY_VIEWED_MAX = 8;

  function initRecentlyViewed() {
    var mount = document.querySelector('[data-recently-viewed]');
    if (!mount || mount.dataset.initialized) return;
    mount.dataset.initialized = 'true';

    var stored = [];
    try {
      stored = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY)) || [];
    } catch (error) {
      stored = [];
    }

    var current = {
      handle: mount.dataset.productHandle,
      title: mount.dataset.productTitle,
      url: mount.dataset.productUrl,
      image: mount.dataset.productImage,
      price: mount.dataset.productPrice
    };

    var updated = [current].concat(
      stored.filter(function (item) {
        return item.handle !== current.handle;
      })
    ).slice(0, RECENTLY_VIEWED_MAX);

    try {
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch (error) {}

    var toShow = updated.filter(function (item) {
      return item.handle !== mount.dataset.currentHandle;
    }).slice(0, 4);

    if (!toShow.length) return;

    var escapeHtml = function (value) {
      var div = document.createElement('div');
      div.textContent = value == null ? '' : String(value);
      return div.innerHTML;
    };

    var cardsHtml = toShow.map(function (item) {
      return (
        '<a class="product-card recently-viewed__card" href="' + escapeHtml(item.url) + '">' +
          '<div class="product-card__media">' +
            (item.image ? '<img class="product-card__image product-card__image--primary" src="' + escapeHtml(item.image) + '" alt="" loading="lazy" width="600" height="800">' : '') +
          '</div>' +
          '<div class="product-card__info">' +
            '<h3 class="product-card__title">' + escapeHtml(item.title) + '</h3>' +
            '<div class="product-card__price"><span>' + escapeHtml(item.price) + '</span></div>' +
          '</div>' +
        '</a>'
      );
    }).join('');

    mount.innerHTML =
      '<div class="container">' +
        '<div class="section-heading"><h2 class="section-heading__title">Recently Viewed</h2></div>' +
        '<div class="product-grid" style="--grid-columns: 4;">' + cardsHtml + '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------
     Size guide dialog
     ------------------------------------------------------------------ */

  function initSizeGuide() {
    var dialog = document.querySelector('[data-size-guide-dialog]');
    if (!dialog || dialog.dataset.initialized) return;
    dialog.dataset.initialized = 'true';

    var tabs = Array.prototype.slice.call(dialog.querySelectorAll('[data-size-guide-tab]'));
    var panels = Array.prototype.slice.call(dialog.querySelectorAll('[data-size-guide-panel]'));
    var closeBtn = dialog.querySelector('[data-size-guide-close]');

    function showCategory(category) {
      tabs.forEach(function (tab) {
        tab.classList.toggle('is-active', tab.dataset.sizeGuideTab === category);
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.sizeGuidePanel !== category;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        showCategory(tab.dataset.sizeGuideTab);
      });
    });

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-size-guide-open]');
      if (!trigger) return;
      var type = (trigger.dataset.garmentType || '').toLowerCase();
      var match = tabs.filter(function (tab) {
        return type.indexOf(tab.dataset.sizeGuideTab) > -1;
      })[0];
      showCategory(match ? match.dataset.sizeGuideTab : (tabs[0] ? tabs[0].dataset.sizeGuideTab : null));
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  /* ---------------------------------------------------------------------
     Login / recover password toggle (native Shopify convention: Shopify
     redirects back to #recover on the same page after a recovery-form
     submission, so the hash alone decides which panel shows).
     ------------------------------------------------------------------ */

  function initAuthForms() {
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
    initCollectionFilters();
    initProductGallery();
    initProductZoom();
    initQuantitySteppers();
    initProductRecommendations();
    initRecentlyViewed();
    initSizeGuide();
    initAuthForms();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll();
    initQuickAdd();
    initCartDrawerInteractions();
  });

  document.addEventListener('shopify:section:load', initAll);
})();
