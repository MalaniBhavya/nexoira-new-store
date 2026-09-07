/* Quick Add: event-delegated so it works for any [data-quick-add-trigger]
   button anywhere on the page, regardless of which section rendered the
   card (collection grid, homepage, related products...). PRD: Quick Add
   must open/select a size before adding. */

(function () {
  var backdrop = document.getElementById('QuickAddBackdrop');
  var popover = document.getElementById('QuickAddPopover');
  if (!backdrop || !popover) return;

  var titleEl = popover.querySelector('[data-quick-add-title]');
  var priceEl = popover.querySelector('[data-quick-add-price]');
  var sizesEl = popover.querySelector('[data-quick-add-sizes]');
  var statusEl = popover.querySelector('[data-quick-add-status]');
  var closeBtn = popover.querySelector('[data-quick-add-close]');

  var i18n = {
    selectSize: popover.getAttribute('data-i18n-select-size'),
    addToCart: popover.getAttribute('data-i18n-add-to-cart'),
    adding: popover.getAttribute('data-i18n-adding'),
    added: popover.getAttribute('data-i18n-added'),
    soldOut: popover.getAttribute('data-i18n-sold-out'),
    error: popover.getAttribute('data-i18n-error'),
  };

  var lastFocused = null;
  var releaseFocusTrap = null;
  var unlockScroll = null;

  function setStatus(text, state) {
    statusEl.textContent = text || '';
    if (state) {
      statusEl.setAttribute('data-state', state);
    } else {
      statusEl.removeAttribute('data-state');
    }
  }

  function buildSizeButtons(product) {
    sizesEl.innerHTML = '';
    product.variants.forEach(function (variant) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'size-option';
      btn.textContent = variant.title;
      btn.setAttribute('aria-pressed', 'false');
      if (!variant.available) {
        btn.disabled = true;
        btn.setAttribute('aria-label', variant.title + ' - ' + i18n.soldOut);
      }
      btn.addEventListener('click', function () {
        selectSize(variant, btn);
      });
      sizesEl.appendChild(btn);
    });
  }

  function selectSize(variant, btn) {
    var allButtons = Array.prototype.slice.call(sizesEl.querySelectorAll('.size-option'));
    var wasDisabled = allButtons.map(function (b) {
      return b.disabled;
    });

    allButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === btn));
      b.disabled = true;
    });
    setStatus(i18n.adding);
    sizesEl.setAttribute('aria-busy', 'true');

    Nexoira.cart
      .addItem(variant.id, 1)
      .then(function () {
        setStatus(i18n.added, 'success');
      })
      .catch(function (err) {
        setStatus((err && err.data && err.data.description) || i18n.error, 'error');
        allButtons.forEach(function (b, i) {
          b.disabled = wasDisabled[i];
        });
      })
      .then(function () {
        sizesEl.removeAttribute('aria-busy');
      });
  }

  function open(handle, trigger) {
    lastFocused = trigger;
    setStatus('');
    titleEl.textContent = '';
    priceEl.textContent = '';
    sizesEl.innerHTML = '';

    backdrop.hidden = false;
    popover.hidden = false;
    unlockScroll = Nexoira.lockScroll();
    window.requestAnimationFrame(function () {
      backdrop.setAttribute('data-open', '');
      popover.setAttribute('data-open', '');
    });
    releaseFocusTrap = Nexoira.trapFocus(popover, { onEscape: close });

    fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } })
      .then(function (response) {
        return response.json();
      })
      .then(function (product) {
        titleEl.textContent = product.title;
        priceEl.textContent = Nexoira.formatMoney(product.price / 100);
        buildSizeButtons(product);
      })
      .catch(function () {
        setStatus(i18n.error, 'error');
      });
  }

  function close() {
    backdrop.removeAttribute('data-open');
    popover.removeAttribute('data-open');
    if (unlockScroll) unlockScroll();
    if (releaseFocusTrap) releaseFocusTrap();
    window.setTimeout(function () {
      backdrop.hidden = true;
      popover.hidden = true;
    }, 250);
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-quick-add-trigger]');
    if (trigger) {
      e.preventDefault();
      open(trigger.getAttribute('data-product-handle'), trigger);
    }
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
})();
