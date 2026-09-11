/**
 * NEXOIRA — wishlist integration point.
 *
 * The theme keeps a device-local list so the control is never dead, and
 * emits events a wishlist app can take over. It deliberately does NOT
 * claim the list is synced to the customer's account: without an app the
 * saves live in this browser only, and the UI says so.
 *
 * An app takes over by calling Nexoira.wishlist.setAdapter({ has, toggle,
 * count }) before DOMContentLoaded, or by listening for
 * `nexoira:wishlist:toggle` and cancelling it.
 */

(function (Nexoira) {
  'use strict';

  var STORAGE_KEY = 'nexoira:wishlist';

  function read() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      /* Storage unavailable — buttons still work for this page view. */
    }
  }

  var adapter = {
    has: function (handle) {
      return read().indexOf(handle) > -1;
    },
    toggle: function (handle) {
      var items = read();
      var index = items.indexOf(handle);
      if (index > -1) items.splice(index, 1);
      else items.unshift(handle);
      write(items);
      return index === -1;
    },
    count: function () {
      return read().length;
    }
  };

  var wishlist = {
    setAdapter: function (custom) {
      adapter = Object.assign({}, adapter, custom);
      wishlist.refresh();
    },
    has: function (handle) { return adapter.has(handle); },
    count: function () { return adapter.count(); },

    refresh: function () {
      document.querySelectorAll('[data-wishlist-toggle]').forEach(function (button) {
        var active = adapter.has(button.dataset.productHandle);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.setAttribute('aria-label', active ? button.dataset.labelRemove : button.dataset.labelAdd);
      });

      var count = adapter.count();
      document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
        el.textContent = count;
        el.hidden = count === 0;
      });
    }
  };

  Nexoira.wishlist = wishlist;

  Nexoira.register(function initWishlist() {
    Nexoira.once('Wishlist', function () {
      document.addEventListener('click', function (event) {
        var button = event.target.closest('[data-wishlist-toggle]');
        if (!button) return;
        event.preventDefault();

        var handle = button.dataset.productHandle;

        /* An installed app cancels this event and manages state itself. */
        var toggleEvent = new CustomEvent('nexoira:wishlist:toggle', {
          bubbles: true,
          cancelable: true,
          detail: { handle: handle, productId: button.dataset.productId, button: button }
        });

        if (!button.dispatchEvent(toggleEvent)) {
          wishlist.refresh();
          return;
        }

        adapter.toggle(handle);
        wishlist.refresh();
      });
    });

    wishlist.refresh();
  });
})(window.Nexoira);
