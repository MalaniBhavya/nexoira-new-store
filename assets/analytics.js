/* Provider-agnostic event layer. A single call site - Nexoira.analytics.track()
   - fans out to whatever the merchant actually has wired up:

   1. window.dataLayer.push()      - works the moment a merchant adds GTM/gtag,
                                      no theme change needed later.
   2. Shopify.analytics.publish()  - Shopify's native, consent-aware pixel bus;
                                      picked up by a Custom Pixel extension if
                                      one is ever added. No-ops today on a
                                      store with no pixel, which is fine - this
                                      is additive, not the load-bearing path.

   Standard commerce events (page views, product views, add to cart, checkout)
   are already tracked automatically by Shopify's native analytics because
   content_for_header is present in both layouts - nothing to build for those.
   This file is only for interactions Shopify doesn't already know about:
   quick view, wishlist, filters, search, popups, support links.

   Delegated so any element anywhere can opt in with zero JS:
     <button data-analytics-event="wishlist_add" data-analytics-payload='{"product_id":"123"}'> */

window.Nexoira = window.Nexoira || {};

(function () {
  window.dataLayer = window.dataLayer || [];

  function pushToDataLayer(name, payload) {
    try {
      var entry = { event: name };
      for (var key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) entry[key] = payload[key];
      }
      window.dataLayer.push(entry);
    } catch (e) {}
  }

  function publishToShopify(name, payload) {
    try {
      if (window.Shopify && window.Shopify.analytics && typeof window.Shopify.analytics.publish === 'function') {
        window.Shopify.analytics.publish(name, payload);
      }
    } catch (e) {}
  }

  Nexoira.analytics = {
    track: function (name, payload) {
      payload = payload || {};
      pushToDataLayer(name, payload);
      publishToShopify(name, payload);
    },
  };

  function parsePayload(el) {
    var raw = el.getAttribute('data-analytics-payload');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-analytics-event]');
    if (!el) return;
    Nexoira.analytics.track(el.getAttribute('data-analytics-event'), parsePayload(el));
  });
})();
