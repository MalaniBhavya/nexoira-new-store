/* Shared cart helper: add items via the Cart AJAX API and broadcast a
   `cart:updated` event so any component on the page (header cart count,
   cart drawer, free-shipping bar) can react without a full reload.
   Used by Quick Add (Phase 5), the PDP (Phase 6) and the cart drawer
   (Phase 7). */

window.Nexoira = window.Nexoira || {};

Nexoira.cart = {
  addItem: function (variantId, quantity) {
    quantity = quantity || 1;
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: quantity }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            var error = new Error(data.description || 'Could not add to cart');
            error.data = data;
            throw error;
          }
          return data;
        });
      })
      .then(function (item) {
        return Nexoira.cart.refresh().then(function () {
          return item;
        });
      });
  },

  refresh: function () {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        return cart;
      });
  },
};
