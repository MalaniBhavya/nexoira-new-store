/* Quick View: event-delegated, same reasoning as quick-add.js. Fetches
   the product's JSON endpoint and renders gallery + sizes + price +
   Add to Cart inside a shared modal. PRD §6: images, sizes, price and
   Add to Cart. */

(function () {
  var backdrop = document.getElementById('QuickViewBackdrop');
  var modal = document.getElementById('QuickViewModal');
  if (!backdrop || !modal) return;

  var titleEl = modal.querySelector('[data-quick-view-title]');
  var priceEl = modal.querySelector('[data-quick-view-price]');
  var sizesEl = modal.querySelector('[data-quick-view-sizes]');
  var statusEl = modal.querySelector('[data-quick-view-status]');
  var mainImageEl = modal.querySelector('[data-quick-view-main-image]');
  var thumbsEl = modal.querySelector('[data-quick-view-thumbs]');
  var fullLinkEl = modal.querySelector('[data-quick-view-full-link]');
  var closeBtn = modal.querySelector('[data-quick-view-close]');

  var i18n = {
    adding: modal.getAttribute('data-i18n-adding'),
    added: modal.getAttribute('data-i18n-added'),
    soldOut: modal.getAttribute('data-i18n-sold-out'),
    error: modal.getAttribute('data-i18n-error'),
    viewFullDetails: modal.getAttribute('data-i18n-view-full-details'),
  };

  var lastFocused = null;
  var releaseFocusTrap = null;
  var unlockScroll = null;

  function resizeUrl(url, width) {
    return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + width;
  }

  function setStatus(text, state) {
    statusEl.textContent = text || '';
    if (state) {
      statusEl.setAttribute('data-state', state);
    } else {
      statusEl.removeAttribute('data-state');
    }
  }

  function setMainImage(url, alt) {
    mainImageEl.innerHTML = '';
    var img = document.createElement('img');
    img.src = resizeUrl(url, 800);
    img.alt = alt || '';
    mainImageEl.appendChild(img);
  }

  function renderPrice(product) {
    priceEl.innerHTML = '';
    var saleAmount = document.createElement('span');
    saleAmount.textContent = Nexoira.formatMoney(product.price / 100);

    if (product.compare_at_price > product.price) {
      saleAmount.className = 'price__amount--sale';
      priceEl.appendChild(saleAmount);
      var compareAmount = document.createElement('s');
      compareAmount.className = 'price__amount--compare';
      compareAmount.textContent = Nexoira.formatMoney(product.compare_at_price / 100);
      priceEl.appendChild(document.createTextNode(' '));
      priceEl.appendChild(compareAmount);
    } else {
      priceEl.appendChild(saleAmount);
    }
  }

  function buildGallery(product) {
    thumbsEl.innerHTML = '';
    if (!product.images.length) return;

    setMainImage(product.images[0], product.title);

    if (product.images.length < 2) return;

    product.images.forEach(function (url, index) {
      var thumb = document.createElement('img');
      thumb.src = resizeUrl(url, 120);
      thumb.alt = '';
      thumb.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('tabindex', '0');
      function select() {
        setMainImage(url, product.title);
        Array.prototype.forEach.call(thumbsEl.children, function (t) {
          t.setAttribute('aria-current', String(t === thumb));
        });
      }
      thumb.addEventListener('click', select);
      thumb.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
      thumbsEl.appendChild(thumb);
    });
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
      });
  }

  function open(handle, trigger) {
    lastFocused = trigger;
    setStatus('');
    titleEl.textContent = '';
    priceEl.textContent = '';
    sizesEl.innerHTML = '';
    mainImageEl.innerHTML = '';
    thumbsEl.innerHTML = '';

    backdrop.hidden = false;
    modal.hidden = false;
    unlockScroll = Nexoira.lockScroll();
    window.requestAnimationFrame(function () {
      backdrop.setAttribute('data-open', '');
      modal.setAttribute('data-open', '');
    });
    releaseFocusTrap = Nexoira.trapFocus(modal, { onEscape: close });

    fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } })
      .then(function (response) {
        return response.json();
      })
      .then(function (product) {
        titleEl.textContent = product.title;
        renderPrice(product);
        fullLinkEl.textContent = i18n.viewFullDetails;
        fullLinkEl.href = product.url;
        buildGallery(product);
        buildSizeButtons(product);
      })
      .catch(function () {
        setStatus(i18n.error, 'error');
      });
  }

  function close() {
    backdrop.removeAttribute('data-open');
    modal.removeAttribute('data-open');
    if (unlockScroll) unlockScroll();
    if (releaseFocusTrap) releaseFocusTrap();
    window.setTimeout(function () {
      backdrop.hidden = true;
      modal.hidden = true;
    }, 250);
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-quick-view-trigger]');
    if (trigger) {
      e.preventDefault();
      open(trigger.getAttribute('data-product-handle'), trigger);
    }
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
})();
