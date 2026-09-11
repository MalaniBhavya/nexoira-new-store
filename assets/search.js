/**
 * NEXOIRA — predictive search.
 *
 * Debounced calls to Shopify's native /search/suggest endpoint, rendered
 * by sections/predictive-search.liquid so result markup stays in Liquid.
 * The form still submits normally if JS fails or is unavailable.
 */

(function (Nexoira) {
  'use strict';

  var DEBOUNCE_MS = 250;
  var MIN_CHARS = 2;

  Nexoira.register(function initPredictiveSearch() {
    document.querySelectorAll('[data-predictive-search-form]').forEach(function (form) {
      if (form.dataset.initialized) return;
      form.dataset.initialized = 'true';

      var input = form.querySelector('[data-predictive-search-input]');
      var results = form.querySelector('[data-predictive-search-results]');
      if (!input || !results) return;

      var timer = null;
      var controller = null;

      function hide() {
        results.hidden = true;
        results.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
      }

      function show(html) {
        results.innerHTML = html;
        results.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }

      function search(term) {
        if (controller) controller.abort();
        controller = new AbortController();

        var url =
          window.theme.routes.predictive_search_url +
          '?q=' + encodeURIComponent(term) +
          '&resources[type]=product,collection,page' +
          '&resources[limit]=5' +
          '&section_id=predictive-search';

        fetch(url, { signal: controller.signal })
          .then(function (response) {
            if (!response.ok) throw new Error('Search failed');
            return response.text();
          })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var panel = doc.querySelector('.predictive-search__panel');
            if (panel) show(panel.outerHTML);
            else hide();
          })
          .catch(function (error) {
            if (error.name !== 'AbortError') hide();
          });
      }

      input.addEventListener('input', function () {
        var term = input.value.trim();
        clearTimeout(timer);

        if (term.length < MIN_CHARS) {
          hide();
          return;
        }

        timer = setTimeout(function () {
          search(term);
        }, DEBOUNCE_MS);
      });

      /* Arrow keys walk the result list; Escape closes it. */
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          hide();
          return;
        }
        if (event.key !== 'ArrowDown' || results.hidden) return;
        var first = results.querySelector('a');
        if (first) {
          event.preventDefault();
          first.focus();
        }
      });

      results.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          hide();
          input.focus();
          return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

        var links = Array.prototype.slice.call(results.querySelectorAll('a'));
        var index = links.indexOf(document.activeElement);
        if (index === -1) return;

        event.preventDefault();
        if (event.key === 'ArrowDown') {
          if (index < links.length - 1) links[index + 1].focus();
        } else if (index === 0) {
          input.focus();
        } else {
          links[index - 1].focus();
        }
      });

      document.addEventListener('click', function (event) {
        if (!form.contains(event.target)) hide();
      });
    });
  });
})(window.Nexoira);
