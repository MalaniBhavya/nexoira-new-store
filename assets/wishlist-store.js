/* Guest wishlist: localStorage-backed, works with zero apps. Isolated
   behind this one file so a real cross-device/account-synced provider
   can replace the storage layer later without touching callers - they
   only ever call Nexoira.wishlist.*, never localStorage directly.

   Guest merge-on-login (PRD §12) is a server-side/customer-account
   concern that needs an app or a customer metafield write, which this
   theme doesn't have write access to from the storefront alone; the
   swap point is documented in snippets/integrations/wishlist-sync-adapter.liquid. */

window.Nexoira = window.Nexoira || {};

(function () {
  var STORAGE_KEY = 'nexoira:wishlist';

  function read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(ids) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { ids: ids } }));
  }

  Nexoira.wishlist = {
    getAll: function () {
      return read();
    },
    has: function (productId) {
      return read().indexOf(String(productId)) > -1;
    },
    add: function (productId) {
      var ids = read();
      productId = String(productId);
      if (ids.indexOf(productId) === -1) {
        ids.push(productId);
        write(ids);
      }
      return true;
    },
    remove: function (productId) {
      var ids = read();
      productId = String(productId);
      var index = ids.indexOf(productId);
      if (index > -1) {
        ids.splice(index, 1);
        write(ids);
      }
      return false;
    },
    toggle: function (productId) {
      return this.has(productId) ? (this.remove(productId), false) : (this.add(productId), true);
    },
  };

  function applyState(el, isWished) {
    el.setAttribute('aria-pressed', String(isWished));
    var label = isWished ? el.getAttribute('data-label-remove') : el.getAttribute('data-label-add');
    if (label) el.setAttribute('aria-label', label);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    var id = btn.getAttribute('data-product-id');
    var isWished = Nexoira.wishlist.toggle(id);
    document.querySelectorAll('[data-wishlist-toggle][data-product-id="' + id + '"]').forEach(function (el) {
      applyState(el, isWished);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var ids = read();
    document.querySelectorAll('[data-wishlist-toggle]').forEach(function (el) {
      var id = el.getAttribute('data-product-id');
      applyState(el, ids.indexOf(id) > -1);
    });
  });
})();
