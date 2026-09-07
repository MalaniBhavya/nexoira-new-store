/* Global cart drawer. Opens automatically after Nexoira.cart.addItem
   (via the cart:item-added event) and when the header cart link is
   clicked. Renders entirely from the cart.js JSON - see
   snippets/cart-drawer.liquid for why. */

(function () {
  var backdrop = document.getElementById('CartDrawerBackdrop');
  var drawer = document.getElementById('CartDrawer');
  if (!backdrop || !drawer) return;

  var closeBtn = drawer.querySelector('[data-cart-drawer-close]');
  var shippingEl = drawer.querySelector('[data-cart-drawer-shipping]');
  var itemsEl = drawer.querySelector('[data-cart-drawer-items]');
  var footerEl = drawer.querySelector('[data-cart-drawer-footer]');
  var subtotalEl = drawer.querySelector('[data-cart-drawer-subtotal]');
  var checkoutLink = drawer.querySelector('[data-cart-drawer-checkout]');

  var threshold = parseInt(drawer.getAttribute('data-free-shipping-threshold'), 10) || 0;
  var i18n = {
    freeShippingMet: drawer.getAttribute('data-i18n-free-shipping-met'),
    freeShippingRemaining: drawer.getAttribute('data-i18n-free-shipping-remaining'),
    empty: drawer.getAttribute('data-i18n-empty'),
    loadError: drawer.getAttribute('data-i18n-load-error'),
    remove: drawer.getAttribute('data-i18n-remove'),
    decrease: drawer.getAttribute('data-i18n-decrease'),
    increase: drawer.getAttribute('data-i18n-increase'),
    lineUnavailable: drawer.getAttribute('data-i18n-line-unavailable'),
    continueShopping: drawer.getAttribute('data-i18n-continue-shopping'),
  };
  var continueShoppingUrl = drawer.getAttribute('data-continue-shopping-url');

  var releaseFocusTrap = null;
  var unlockScroll = null;

  function renderShipping(cart) {
    if (!threshold) {
      shippingEl.innerHTML = '';
      return;
    }
    var remaining = threshold - cart.total_price;
    var percent = Math.min(100, Math.round((cart.total_price / threshold) * 100));
    var message =
      remaining <= 0
        ? i18n.freeShippingMet
        : i18n.freeShippingRemaining.replace('%AMOUNT%', Nexoira.formatMoney(remaining / 100));

    shippingEl.innerHTML =
      '<p class="free-shipping-progress__message' +
      (remaining <= 0 ? ' free-shipping-progress__message--met' : '') +
      '">' +
      message +
      '</p>' +
      '<div class="free-shipping-progress__bar"><div class="free-shipping-progress__fill" style="width:' +
      percent +
      '%;"></div></div>';
  }

  function resizeUrl(url, width) {
    if (!url) return '';
    return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + width;
  }

  function renderItems(cart) {
    itemsEl.innerHTML = '';

    if (cart.item_count === 0) {
      var empty = document.createElement('p');
      empty.className = 'cart-drawer__empty';
      empty.textContent = i18n.empty;
      itemsEl.appendChild(empty);
      footerEl.hidden = true;
      return;
    }

    cart.items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'cart-drawer-line';
      row.setAttribute('data-line-key', item.key);

      var imageWrap = document.createElement('a');
      imageWrap.className = 'cart-drawer-line__image';
      imageWrap.href = item.url;
      if (item.image) {
        var img = document.createElement('img');
        img.src = resizeUrl(item.image, 128);
        img.alt = item.title;
        img.loading = 'lazy';
        imageWrap.appendChild(img);
      }
      row.appendChild(imageWrap);

      var details = document.createElement('div');
      details.className = 'cart-drawer-line__details';

      var title = document.createElement('a');
      title.className = 'cart-drawer-line__title';
      title.href = item.url;
      title.textContent = item.product_title;
      details.appendChild(title);

      if (item.variant_title && item.variant_title !== 'Default Title') {
        var variant = document.createElement('p');
        variant.className = 'cart-drawer-line__variant';
        variant.textContent = item.variant_title;
        details.appendChild(variant);
      }

      var price = document.createElement('p');
      price.className = 'cart-drawer-line__price';
      price.textContent = Nexoira.formatMoney(item.final_line_price / 100);
      details.appendChild(price);

      if (item.available === false) {
        var warning = document.createElement('p');
        warning.className = 'field__error';
        warning.textContent = i18n.lineUnavailable;
        details.appendChild(warning);
      }

      var controls = document.createElement('div');
      controls.className = 'cart-drawer-line__controls';

      var qty = document.createElement('div');
      qty.className = 'quantity-selector';

      var decreaseBtn = document.createElement('button');
      decreaseBtn.type = 'button';
      decreaseBtn.className = 'quantity-selector__button';
      decreaseBtn.setAttribute('aria-label', i18n.decrease);
      decreaseBtn.innerHTML = '&minus;';
      decreaseBtn.addEventListener('click', function () {
        changeQuantity(item.key, Math.max(0, item.quantity - 1));
      });

      var qtyValue = document.createElement('span');
      qtyValue.className = 'quantity-selector__input';
      qtyValue.textContent = item.quantity;

      var increaseBtn = document.createElement('button');
      increaseBtn.type = 'button';
      increaseBtn.className = 'quantity-selector__button';
      increaseBtn.setAttribute('aria-label', i18n.increase);
      increaseBtn.innerHTML = '&plus;';
      increaseBtn.addEventListener('click', function () {
        changeQuantity(item.key, item.quantity + 1);
      });

      qty.appendChild(decreaseBtn);
      qty.appendChild(qtyValue);
      qty.appendChild(increaseBtn);
      controls.appendChild(qty);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'button--tertiary';
      removeBtn.textContent = i18n.remove;
      removeBtn.addEventListener('click', function () {
        changeQuantity(item.key, 0);
      });
      controls.appendChild(removeBtn);

      details.appendChild(controls);
      row.appendChild(details);
      itemsEl.appendChild(row);
    });

    footerEl.hidden = false;
    subtotalEl.textContent = Nexoira.formatMoney(cart.total_price / 100);
    checkoutLink.href = '/checkout';
  }

  function changeQuantity(lineKey, quantity) {
    Nexoira.cart.updateItem(lineKey, quantity).catch(function () {
      Nexoira.cart.refresh();
    });
  }

  function render(cart) {
    renderShipping(cart);
    renderItems(cart);
  }

  function renderError() {
    shippingEl.innerHTML = '';
    itemsEl.innerHTML = '';
    footerEl.hidden = true;
    var error = document.createElement('p');
    error.className = 'cart-drawer__empty';
    error.setAttribute('role', 'alert');
    error.textContent = i18n.loadError;
    itemsEl.appendChild(error);
  }

  function open() {
    drawer.hidden = false;
    backdrop.hidden = false;
    unlockScroll = Nexoira.lockScroll();
    window.requestAnimationFrame(function () {
      drawer.setAttribute('data-open', '');
      backdrop.setAttribute('data-open', '');
    });
    releaseFocusTrap = Nexoira.trapFocus(drawer, { onEscape: close });
    Nexoira.cart.refresh().catch(renderError);
  }

  function close() {
    drawer.removeAttribute('data-open');
    backdrop.removeAttribute('data-open');
    if (unlockScroll) unlockScroll();
    if (releaseFocusTrap) releaseFocusTrap();
    window.setTimeout(function () {
      drawer.hidden = true;
      backdrop.hidden = true;
    }, 250);
  }

  document.addEventListener('cart:item-added', function (e) {
    render(e.detail);
    open();
  });

  document.addEventListener('cart:updated', function (e) {
    render(e.detail);
  });

  document.addEventListener('click', function (e) {
    var cartLink = e.target.closest('[data-cart-link]');
    if (cartLink) {
      e.preventDefault();
      open();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
})();
