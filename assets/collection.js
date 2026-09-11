/**
 * NEXOIRA — collection and search listing.
 *
 * Filtering and sorting use Shopify's native filter URLs (Search &
 * Discovery). The grid is refreshed by re-fetching the section, so the
 * server stays the single source of truth for what matches.
 */

(function (Nexoira) {
  'use strict';

  function openFilterDrawer(root) {
    var drawer = root.querySelector('[data-filter-drawer]');
    var overlay = root.querySelector('[data-filter-drawer-overlay]');
    var trigger = root.querySelector('[data-filter-drawer-open]');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('filter-drawer-open');

    var closeBtn = drawer.querySelector('[data-filter-drawer-close]');
    if (closeBtn) closeBtn.focus();
    root.releaseFilterFocus = Nexoira.trapFocus(drawer, trigger);
  }

  function closeFilterDrawer(root) {
    var drawer = root.querySelector('[data-filter-drawer]');
    var overlay = root.querySelector('[data-filter-drawer-overlay]');
    var trigger = root.querySelector('[data-filter-drawer-open]');
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('filter-drawer-open');
    if (root.releaseFilterFocus) {
      root.releaseFilterFocus();
      root.releaseFilterFocus = null;
    }
  }

  Nexoira.register(function initCollectionFilters() {
    var root = document.querySelector('[data-collection-section-root]');
    if (!root || root.dataset.filtersInitialized) return;
    root.dataset.filtersInitialized = 'true';

    var sectionId = root.dataset.sectionFetchId;

    function render(url, pushState) {
      var separator = url.indexOf('?') > -1 ? '&' : '?';
      root.classList.add('is-loading');
      root.setAttribute('aria-busy', 'true');

      fetch(url + separator + 'section_id=' + sectionId)
        .then(function (response) {
          if (!response.ok) throw new Error('Filter request failed');
          return response.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var freshRoot = doc.querySelector('[data-collection-section-root]');
          if (!freshRoot) throw new Error('Missing section root');

          root.innerHTML = freshRoot.innerHTML;
          root.classList.remove('is-loading');
          root.removeAttribute('aria-busy');
          if (pushState) window.history.pushState({ nexoiraFilter: true }, '', url);

          var anchor = root.querySelector('[data-collection-results-top]') || root;
          window.scrollTo({
            top: anchor.getBoundingClientRect().top + window.scrollY - 100,
            behavior: Nexoira.prefersReducedMotion ? 'auto' : 'smooth'
          });

          Nexoira.initAll();
        })
        .catch(function () {
          /* Fall back to a normal navigation rather than stranding the
             shopper on a stale grid. */
          window.location.href = url;
        });
    }

    function buildUrlFromFilterForm(form) {
      var params = new URLSearchParams(new FormData(form));

      /* Strip empty price inputs so they don't become ?filter.v.price.gte= */
      Array.from(params.keys()).forEach(function (key) {
        if (params.get(key) === '') params.delete(key);
      });

      var sortSelect = root.querySelector('[data-collection-sort]');
      if (sortSelect && sortSelect.value) params.set('sort_by', sortSelect.value);

      var query = params.toString();
      return window.location.pathname + (query ? '?' + query : '');
    }

    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-filter-drawer-open]')) {
        openFilterDrawer(root);
        return;
      }
      if (event.target.closest('[data-filter-drawer-close]') || event.target.closest('[data-filter-drawer-overlay]')) {
        closeFilterDrawer(root);
        return;
      }

      var link = event.target.closest('a');
      if (!link) return;
      if (
        link.closest('.filter-pill') ||
        link.closest('.collection-active-filters__clear') ||
        link.closest('.pagination') ||
        link.closest('[data-filter-clear]')
      ) {
        event.preventDefault();
        closeFilterDrawer(root);
        render(link.getAttribute('href'), true);
      }
    });

    root.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-filter-form]');
      if (!form) return;
      event.preventDefault();
      closeFilterDrawer(root);
      render(buildUrlFromFilterForm(form), true);
    });

    root.addEventListener('change', function (event) {
      if (event.target.matches('[data-collection-sort]')) {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', event.target.value);
        render(url.pathname + '?' + url.searchParams.toString(), true);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeFilterDrawer(root);
    });

    window.addEventListener('popstate', function () {
      render(window.location.href, false);
    });
  });
})(window.Nexoira);
