/**
 * Nexoira theme foundation JS.
 * Minimal vanilla JS covering structural interactions only:
 * mobile nav toggle, product variant -> form sync, cart quantity updates.
 * No dependencies. Homepage interactions are added with each new section.
 */

(function () {
  'use strict';

  function initMobileNav() {
    var toggle = document.querySelector('.site-header__menu-toggle');
    var nav = document.getElementById('SiteNav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
    });
  }

  function initProductForm() {
    var form = document.getElementById('ProductForm');
    if (!form) return;

    var optionSelects = form.querySelectorAll('.product__option-select');
    var hiddenIdInput = document.getElementById('ProductSelectedVariant');

    optionSelects.forEach(function (select) {
      select.addEventListener('change', function () {
        if (hiddenIdInput) {
          form.dispatchEvent(new CustomEvent('nexoira:variant-option-change'));
        }
      });
    });
  }

  function initCartQuantities() {
    var cartForm = document.querySelector('.cart__form');
    if (!cartForm) return;

    var quantityInputs = cartForm.querySelectorAll('input[name="updates[]"]');
    quantityInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (parseInt(input.value, 10) < 0) {
          input.value = 0;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initProductForm();
    initCartQuantities();
  });
})();
