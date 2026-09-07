/* Recently Viewed: localStorage-only, no app. main-product.liquid calls
   Nexoira.recentlyViewed.record() on load; sections/recently-viewed.liquid
   calls .getHandles() and fetches each product's JSON to render a light
   card strip (can't reuse the server-rendered card-product snippet from
   client-side JS, so this renders a simpler image+title+price card). */

window.Nexoira = window.Nexoira || {};

(function () {
  var STORAGE_KEY = 'nexoira:recently-viewed';
  var MAX_ITEMS = 12;

  function read() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(handles) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
    } catch (e) {}
  }

  Nexoira.recentlyViewed = {
    record: function (handle) {
      if (!handle) return;
      var handles = read().filter(function (h) {
        return h !== handle;
      });
      handles.unshift(handle);
      write(handles.slice(0, MAX_ITEMS));
    },
    getHandles: function (excludeHandle, limit) {
      return read()
        .filter(function (h) {
          return h !== excludeHandle;
        })
        .slice(0, limit || MAX_ITEMS);
    },
  };
})();
