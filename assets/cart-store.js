/* Shared cart helper: mutate the cart via the Cart AJAX API and
   broadcast events so any component on the page (header cart count,
   cart drawer, free-shipping bar) can react without a full reload.
   Used by Quick Add, the PDP, and the cart drawer/page.

   Two events:
   - cart:updated    fires on every mutation - components that just need
                      to reflect current totals/count listen for this.
   - cart:item-added  fires only after addItem specifically - the cart
                      drawer listens for this to auto-open, so incrementing
                      a quantity inside an already-open drawer doesn't
                      re-trigger the open animation. */

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
        return Nexoira.cart.refresh().then(function (cart) {
          document.dispatchEvent(new CustomEvent('cart:item-added', { detail: cart }));
          return item;
        });
      });
  },

  /* lineKey is the cart line item's unique `.key` (variant + properties
     hash) - more reliable than a 1-based line position, which can shift
     if another request removes/reorders items concurrently. */
  updateItem: function (lineKey, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: lineKey, quantity: quantity }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            var error = new Error(data.description || 'Could not update cart');
            error.data = data;
            throw error;
          }
          return data;
        });
      })
      .then(function (cart) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
        return cart;
      });
  },

  removeItem: function (lineKey) {
    return Nexoira.cart.updateItem(lineKey, 0);
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
