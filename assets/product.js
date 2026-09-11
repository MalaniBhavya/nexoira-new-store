/**
 * NEXOIRA — product page.
 *
 * Loaded only on product templates. Owns variant selection, the gallery,
 * the sticky mobile purchase bar, recommendations, recently viewed and the
 * size guide.
 */

(function (Nexoira) {
  'use strict';

  /* ---------------------------------------------------------------------
     Variant selection
     ------------------------------------------------------------------ */

  Nexoira.register(function initProductForms() {
    document.querySelectorAll('[data-product-form]').forEach(function (form) {
      if (form.dataset.initialized) return;
      form.dataset.initialized = 'true';

      var root = form.closest('[data-product-root]') || document;
      var hiddenIdInput = form.querySelector('[data-variant-id-input]');
      var addButton = form.querySelector('[data-add-to-cart]');
      var priceContainer = root.querySelector('[data-product-price]');
      var stickyBar = document.querySelector('[data-sticky-atc]');

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

      var optionInputs = Array.prototype.slice.call(form.querySelectorAll('[data-option-input]'));
      var positions = [];
      optionInputs.forEach(function (input) {
        if (positions.indexOf(input.dataset.optionPosition) === -1) {
          positions.push(input.dataset.optionPosition);
        }
      });
      positions.sort(function (a, b) {
        return parseInt(a, 10) - parseInt(b, 10);
      });

      function selectedValues() {
        return positions.map(function (pos) {
          var checked = form.querySelector('[data-option-input][data-option-position="' + pos + '"]:checked');
          return checked ? checked.value : null;
        });
      }

      function findVariant(values) {
        return variants.filter(function (variant) {
          return values.every(function (value, index) {
            return value === null || variant['option' + (index + 1)] === value;
          });
        })[0];
      }

      /**
       * Mark option values that cannot be reached from the current
       * selection. Sold-out combinations stay selectable (so the shopper
       * can see they are sold out) but are visually struck through.
       */
      function refreshAvailability() {
        var current = selectedValues();

        optionInputs.forEach(function (input) {
          var position = parseInt(input.dataset.optionPosition, 10);
          var candidate = current.slice();
          candidate[position - 1] = input.value;

          var matches = variants.filter(function (variant) {
            return candidate.every(function (value, index) {
              return value === null || variant['option' + (index + 1)] === value;
            });
          });

          var exists = matches.length > 0;
          var inStock = matches.some(function (variant) {
            return variant.available;
          });

          var label = input.closest('label');
          if (!label) return;
          label.classList.toggle('is-unavailable', !exists || !inStock);
          input.disabled = !exists;
        });
      }

      function renderPrice(container, variant) {
        if (!container) return;
        var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        var html = '<span class="price__current">' + Nexoira.formatMoney(variant.price) + '</span>';
        if (onSale) {
          html =
            '<span class="price__current price__current--sale">' + Nexoira.formatMoney(variant.price) + '</span>' +
            '<s class="price__compare">' + Nexoira.formatMoney(variant.compare_at_price) + '</s>';
          var off = Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100);
          if (off > 0) html += '<span class="price__badge">' + off + '% off</span>';
        }
        container.innerHTML = html;
      }

      function setButtonState(button, variant) {
        if (!button) return;
        if (variant && variant.available) {
          button.removeAttribute('disabled');
          button.textContent = button.dataset.labelAvailable || button.textContent;
        } else {
          button.setAttribute('disabled', 'disabled');
          button.textContent = variant
            ? button.dataset.labelSoldOut || 'Sold out'
            : button.dataset.labelUnavailable || 'Unavailable';
        }
      }

      /** Show the media attached to this variant, if the product has any. */
      function showVariantMedia(variant) {
        if (!variant || !variant.featured_media) return;
        var slide = document.querySelector('[data-gallery-slide][data-media-id="' + variant.featured_media.id + '"]');
        if (!slide) return;
        var gallery = slide.closest('[data-product-gallery]');
        if (!gallery) return;
        var slides = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
        var index = slides.indexOf(slide);
        if (index > -1 && gallery.goToSlide) gallery.goToSlide(index);
      }

      function updateUrl(variant) {
        if (!variant || !window.history.replaceState) return;
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }

      function update() {
        refreshAvailability();
        var variant = findVariant(selectedValues());

        if (hiddenIdInput) hiddenIdInput.value = variant ? variant.id : '';
        if (variant) {
          renderPrice(priceContainer, variant);
          if (stickyBar) renderPrice(stickyBar.querySelector('[data-sticky-price]'), variant);
          showVariantMedia(variant);
          updateUrl(variant);
        }
        setButtonState(addButton, variant);
        if (stickyBar) setButtonState(stickyBar.querySelector('[data-sticky-add]'), variant);

        var skuEl = root.querySelector('[data-product-sku]');
        if (skuEl && variant) skuEl.textContent = variant.sku || '';
      }

      optionInputs.forEach(function (input) {
        input.addEventListener('change', function () {
          var pos = input.dataset.optionPosition;
          form.querySelectorAll('[data-option-input][data-option-position="' + pos + '"]').forEach(function (sibling) {
            var label = sibling.closest('label');
            if (label) label.classList.toggle('is-selected', sibling.checked);
          });

          var group = input.closest('[data-option-group]');
          var valueDisplay = group ? group.querySelector('[data-option-selected-value]') : null;
          if (valueDisplay) valueDisplay.textContent = input.dataset.optionLabel || input.value;

          update();
        });
      });

      refreshAvailability();
    });
  });

  /* ---------------------------------------------------------------------
     Add to cart (product form and sticky bar share one handler)
     ------------------------------------------------------------------ */

  Nexoira.register(function initProductAddToCart() {
    document.querySelectorAll('[data-product-form]').forEach(function (form) {
      if (form.dataset.atcInitialized) return;
      form.dataset.atcInitialized = 'true';

      var addButton = form.querySelector('[data-add-to-cart]');

      function submit(button) {
        if (!button || button.hasAttribute('disabled') || button.dataset.loading) return;

        var originalText = button.textContent;
        var quantityField = form.querySelector('[name="quantity"]');
        var idField = form.querySelector('[data-variant-id-input]') || form.querySelector('[name="id"]');
        if (!idField || !idField.value) return;

        button.dataset.loading = 'true';
        button.setAttribute('disabled', 'disabled');
        button.textContent = button.dataset.labelAdding || 'Adding…';

        Nexoira.cart
          .request(window.theme.routes.cart_add_url + '.js', {
            id: idField.value,
            quantity: parseInt(quantityField ? quantityField.value : 1, 10) || 1
          })
          .then(function (data) {
            Nexoira.cart.apply(data);
            Nexoira.cart.open();
            button.textContent = originalText;
            button.removeAttribute('disabled');
            delete button.dataset.loading;
          })
          .catch(function (error) {
            button.textContent = error.message && error.message.length < 40 ? error.message : 'Try again';
            button.removeAttribute('disabled');
            delete button.dataset.loading;
            setTimeout(function () {
              button.textContent = originalText;
            }, 2200);
          });
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        submit(addButton);
      });

      var stickyAdd = document.querySelector('[data-sticky-add]');
      if (stickyAdd) {
        stickyAdd.addEventListener('click', function () {
          submit(stickyAdd);
        });
      }
    });
  });

  /* ---------------------------------------------------------------------
     Sticky mobile purchase bar: shown once the real add-to-cart button
     has scrolled out of view.
     ------------------------------------------------------------------ */

  Nexoira.register(function initStickyAtc() {
    var bar = document.querySelector('[data-sticky-atc]');
    var anchor = document.querySelector('[data-add-to-cart]');
    if (!bar || !anchor || bar.dataset.initialized) return;
    bar.dataset.initialized = 'true';

    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
      },
      { threshold: 0 }
    );

    observer.observe(anchor);
  });

  /* ---------------------------------------------------------------------
     Gallery: thumbnails, swipe, and a goToSlide hook for variant media
     ------------------------------------------------------------------ */

  Nexoira.register(function initProductGallery() {
    document.querySelectorAll('[data-product-gallery]').forEach(function (gallery) {
      if (gallery.dataset.initialized) return;
      gallery.dataset.initialized = 'true';

      var slides = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
      var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-thumb]'));
      var main = gallery.querySelector('[data-gallery-main]');
      var counter = gallery.querySelector('[data-gallery-counter-current]');
      if (slides.length < 2) return;

      function goTo(index) {
        index = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle('is-active', i === index);
          slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
        });
        thumbs.forEach(function (thumb, i) {
          thumb.classList.toggle('is-active', i === index);
          thumb.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
        if (counter) counter.textContent = index + 1;
      }

      /* Exposed so variant changes can drive the gallery. */
      gallery.goToSlide = goTo;

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
          if (Math.abs(deltaX) > 40) goTo(deltaX < 0 ? current + 1 : current - 1);
          touchStartX = null;
        });
      }
    });
  });

  /* ---------------------------------------------------------------------
     Image zoom (native <dialog>)
     ------------------------------------------------------------------ */

  Nexoira.register(function initProductZoom() {
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
  });

  /* ---------------------------------------------------------------------
     Quantity stepper
     ------------------------------------------------------------------ */

  Nexoira.register(function initQuantitySteppers() {
    Nexoira.once('QuantityStepper', function () {
      document.addEventListener('click', function (event) {
        var decrease = event.target.closest('[data-quantity-decrease]');
        var increase = event.target.closest('[data-quantity-increase]');
        if (!decrease && !increase) return;

        var stepper = (decrease || increase).closest('[data-quantity-stepper]');
        var input = stepper ? stepper.querySelector('input[type="number"]') : null;
        if (!input) return;

        var value = parseInt(input.value, 10) || 1;
        var min = parseInt(input.min, 10) || 1;
        input.value = decrease ? Math.max(min, value - 1) : value + 1;
      });
    });
  });

  /* ---------------------------------------------------------------------
     Product recommendations (native recommendations endpoint)
     ------------------------------------------------------------------ */

  Nexoira.register(function initProductRecommendations() {
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
        if (section) {
          mount.innerHTML = section.outerHTML;
          Nexoira.initAll();
        }
      })
      .catch(function () {});
  });

  /* ---------------------------------------------------------------------
     Recently viewed (localStorage only — no extra network requests)
     ------------------------------------------------------------------ */

  var RECENTLY_VIEWED_KEY = 'nexoira:recently-viewed';
  var RECENTLY_VIEWED_MAX = 8;

  Nexoira.register(function initRecentlyViewed() {
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

    var updated = [current]
      .concat(
        stored.filter(function (item) {
          return item && item.handle !== current.handle;
        })
      )
      .slice(0, RECENTLY_VIEWED_MAX);

    try {
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch (error) {
      /* Private browsing or a full quota — the rail simply stays empty. */
    }

    var toShow = updated
      .filter(function (item) {
        return item.handle !== mount.dataset.currentHandle;
      })
      .slice(0, 4);

    if (!toShow.length) return;

    var esc = Nexoira.escapeHtml;
    var cardsHtml = toShow
      .map(function (item) {
        return (
          '<a class="product-card recently-viewed__card" href="' + esc(item.url) + '">' +
            '<div class="product-card__media">' +
              (item.image
                ? '<img class="product-card__image product-card__image--primary" src="' + esc(item.image) + '" alt="" loading="lazy" width="600" height="750">'
                : '') +
            '</div>' +
            '<div class="product-card__info">' +
              '<h3 class="product-card__title">' + esc(item.title) + '</h3>' +
              '<div class="product-card__price"><span class="price__current">' + esc(item.price) + '</span></div>' +
            '</div>' +
          '</a>'
        );
      })
      .join('');

    mount.innerHTML =
      '<div class="container">' +
        '<div class="section-heading"><h2 class="section-heading__title">' + esc(mount.dataset.heading || 'Recently viewed') + '</h2></div>' +
        '<div class="product-grid" style="--grid-columns: 4;">' + cardsHtml + '</div>' +
      '</div>';
  });

  /* ---------------------------------------------------------------------
     Size guide dialog
     ------------------------------------------------------------------ */

  Nexoira.register(function initSizeGuide() {
    var dialog = document.querySelector('[data-size-guide-dialog]');
    if (!dialog || dialog.dataset.initialized) return;
    dialog.dataset.initialized = 'true';

    var tabs = Array.prototype.slice.call(dialog.querySelectorAll('[data-size-guide-tab]'));
    var panels = Array.prototype.slice.call(dialog.querySelectorAll('[data-size-guide-panel]'));
    var closeBtn = dialog.querySelector('[data-size-guide-close]');

    function showCategory(category) {
      if (!category) return;
      tabs.forEach(function (tab) {
        var isActive = tab.dataset.sizeGuideTab === category;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
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

      /* Pick the tab whose key appears in the product's type or tags, so
         a shirt opens the shirt chart rather than the first one. */
      var haystack = (trigger.dataset.garmentType || '').toLowerCase();
      var match = tabs.filter(function (tab) {
        return haystack.indexOf(tab.dataset.sizeGuideTab) > -1;
      })[0];

      showCategory(match ? match.dataset.sizeGuideTab : tabs[0] && tabs[0].dataset.sizeGuideTab);
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  /* ---------------------------------------------------------------------
     Pincode serviceability.

     Integration point only. The theme validates the shape of an Indian
     PIN code and then hands off to whatever checker the merchant has
     installed, via a `nexoira:pincode:check` event. With no app listening
     it says so plainly rather than inventing a delivery date.
     ------------------------------------------------------------------ */

  Nexoira.register(function initPincodeChecker() {
    var widget = document.querySelector('[data-pincode-checker]');
    if (!widget || widget.dataset.initialized) return;
    widget.dataset.initialized = 'true';

    var form = widget.querySelector('form');
    var input = widget.querySelector('[data-pincode-input]');
    var result = widget.querySelector('[data-pincode-result]');
    if (!form || !input || !result) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = input.value.trim();

      if (!/^[1-9][0-9]{5}$/.test(value)) {
        result.hidden = false;
        result.className = 'pincode__result pincode__result--error';
        result.textContent = widget.dataset.messageInvalid || 'Enter a valid 6-digit PIN code.';
        return;
      }

      result.hidden = false;
      result.className = 'pincode__result';
      result.textContent = widget.dataset.messageChecking || 'Checking…';

      /* An installed app cancels this event and renders its own answer. */
      var checkEvent = new CustomEvent('nexoira:pincode:check', {
        bubbles: true,
        cancelable: true,
        detail: { pincode: value, resultElement: result }
      });

      var handled = !widget.dispatchEvent(checkEvent);
      if (handled) return;

      result.className = 'pincode__result pincode__result--info';
      result.textContent = widget.dataset.messageFallback || '';
    });
  });
})(window.Nexoira);
