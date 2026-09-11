/**
 * NEXOIRA — cart.
 *
 * The drawer markup is always server-rendered Liquid: every mutation goes
 * through a cart endpoint with the native `sections` parameter and swaps
 * in the returned HTML. Nothing about a line item is rebuilt in JS, so the
 * free-shipping bar, discounts and totals stay correct by construction.
 */

(function (Nexoira) {
  'use strict';

  var CART_DRAWER_SECTION = 'cart-drawer';
  var cart = {};

  function updateCartCount(itemCount) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = itemCount;
      el.classList.toggle('is-empty', parseInt(itemCount, 10) === 0);
    });
  }

  function replaceCartDrawerMarkup(sectionHtml) {
    if (!sectionHtml) return;
    var doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
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

  var releaseDrawerFocus = null;

  cart.open = function () {
    var drawer = document.querySelector('[data-cart-drawer]');
    var overlay = document.querySelector('[data-cart-drawer-overlay]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('is-open');
    document.body.classList.add('cart-drawer-open');

    var closeBtn = drawer.querySelector('[data-cart-drawer-close]');
    if (closeBtn) closeBtn.focus();
    releaseDrawerFocus = Nexoira.trapFocus(drawer, document.querySelector('[data-cart-drawer-open]'));
  };

  cart.close = function () {
    var drawer = document.querySelector('[data-cart-drawer]');
    var overlay = document.querySelector('[data-cart-drawer-overlay]');
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('cart-drawer-open');
    if (releaseDrawerFocus) {
      releaseDrawerFocus();
      releaseDrawerFocus = null;
    }
  };

  cart.request = function (url, body) {
    body = body || {};
    body.sections = CART_DRAWER_SECTION;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          /* Shopify returns a `description` for cart errors such as
             "all N are in your cart" — surface it rather than a generic
             failure. */
          var error = new Error(data.description || data.message || 'Cart request failed');
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  };

  cart.apply = function (data) {
    /* /cart/add.js resolves with the added line item, not the cart, so it
       has no item_count. Rather than branch per endpoint, read the count
       back off the freshly rendered drawer, which Liquid always gets right. */
    if (data.sections && data.sections[CART_DRAWER_SECTION]) {
      replaceCartDrawerMarkup(data.sections[CART_DRAWER_SECTION]);
    }
    var drawer = document.querySelector('[data-cart-drawer]');
    if (drawer && typeof drawer.dataset.cartItemCount !== 'undefined') {
      updateCartCount(drawer.dataset.cartItemCount);
    }
    document.dispatchEvent(new CustomEvent('nexoira:cart:updated', { detail: data }));
  };

  Nexoira.cart = cart;

  /* ---------------------------------------------------------------------
     Drawer interactions (delegated, bound once)
     ------------------------------------------------------------------ */

  Nexoira.register(function initCartDrawer() {
    Nexoira.once('CartDrawer', function () {
      document.addEventListener('click', function (event) {
        if (event.target.closest('[data-cart-drawer-open]')) {
          event.preventDefault();
          cart.open();
          return;
        }

        if (event.target.closest('[data-cart-drawer-close]') || event.target.closest('[data-cart-drawer-overlay]')) {
          event.preventDefault();
          cart.close();
          return;
        }

        var qtyButton = event.target.closest('[data-cart-qty]');
        if (qtyButton) {
          var item = qtyButton.closest('.cart-drawer__item');
          var valueEl = item ? item.querySelector('.cart-drawer__qty-value') : null;
          var current = valueEl ? parseInt(valueEl.textContent, 10) : 0;
          var next = qtyButton.dataset.cartQty === 'increase' ? current + 1 : current - 1;
          cart
            .request(window.theme.routes.cart_change_url + '.js', {
              line: parseInt(qtyButton.dataset.line, 10),
              quantity: Math.max(next, 0)
            })
            .then(cart.apply)
            .catch(function () {});
          return;
        }

        var removeButton = event.target.closest('[data-cart-remove]');
        if (removeButton) {
          cart
            .request(window.theme.routes.cart_change_url + '.js', {
              line: parseInt(removeButton.dataset.line, 10),
              quantity: 0
            })
            .then(cart.apply)
            .catch(function () {});
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') cart.close();
      });
    });
  });

  /* ---------------------------------------------------------------------
     Quick add from product cards: AJAX for single-variant products,
     otherwise send the shopper to the product page to choose options.
     ------------------------------------------------------------------ */

  Nexoira.register(function initQuickAdd() {
    Nexoira.once('QuickAdd', function () {
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
        button.textContent = button.dataset.labelAdding || 'Adding…';

        cart
          .request(window.theme.routes.cart_add_url + '.js', { id: button.dataset.variantId, quantity: 1 })
          .then(function (data) {
            button.textContent = button.dataset.labelAdded || 'Added';
            cart.apply(data);
            cart.open();
            setTimeout(function () {
              button.textContent = originalText;
              delete button.dataset.loading;
            }, 1600);
          })
          .catch(function () {
            button.textContent = button.dataset.labelError || 'Try again';
            setTimeout(function () {
              button.textContent = originalText;
              delete button.dataset.loading;
            }, 1600);
          });
      });
    });
  });

  /* ---------------------------------------------------------------------
     Cart page quantity guard
     ------------------------------------------------------------------ */

  Nexoira.register(function initCartQuantities() {
    var cartForm = document.querySelector('.cart__form');
    if (!cartForm || cartForm.dataset.initialized) return;
    cartForm.dataset.initialized = 'true';

    cartForm.querySelectorAll('input[name="updates[]"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (parseInt(input.value, 10) < 0) input.value = 0;
      });
    });
  });
})(window.Nexoira);
