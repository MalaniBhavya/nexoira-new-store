# Nexoira — Shopify Theme

A from-scratch Online Store 2.0 theme for Nexoira, an India-only DTC menswear
brand (Shirts, Kurtas, Pants). Built with vanilla Liquid, JSON templates,
sections/blocks, plain CSS and lightweight vanilla JS — no build step, no
npm, no framework, no external font CDN at runtime. Designed to run on
Shopify Basic with **zero paid apps** at launch; every feature that would
normally need an app has a native, working fallback today and a documented
swap-in point for later (see [App-dependent features & adapters](#app-dependent-features--adapters)).

This document is the single reference for getting the theme from this repo
into a live, fully-configured store: how to push it, everything you need to
create in the Shopify admin before it looks right, what every Theme Editor
setting controls, the analytics events it emits, and what's intentionally
left as a documented gap rather than a fake feature.

---

## 1. Pushing the theme

You'll need the [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and
a development store (or the live store, with care).

```sh
# from the repo root
shopify theme dev --store your-store.myshopify.com     # live-reload preview
shopify theme push --store your-store.myshopify.com     # push to the store's theme library
shopify theme push --store your-store.myshopify.com --live   # publish immediately (careful)
```

If you don't have the CLI installed:

```sh
npm install -g @shopify/cli
# or, without a global install:
npx @shopify/cli theme push --store your-store.myshopify.com
```

Run `shopify theme check` before pushing if you make further changes — the
theme currently passes with **0 errors, 0 warnings**. `npx @shopify/cli
theme check` works even without a global CLI install.

---

## 2. File map

```
layout/
  theme.liquid          Main layout: head (fonts, CSS, meta/OG/JSON-LD), global JS,
                         header/footer section groups, cart drawer/quick-add/quick-view
                         shells rendered once here.
  password.liquid        Minimal layout for the password-protected storefront gate.

templates/               One JSON file per page type; maps to a section (see §5).
  customers/              Login, register, account, addresses, order, password reset/activate.

sections/
  header.liquid, footer.liquid, announcement-bar.liquid   Global chrome.
  header-group.json, footer-group.json                    Section groups theme.liquid renders.
  main-product.liquid                                      PDP: gallery, sibling colors, size
                                                             selector, delivery/COD/returns info,
                                                             accordions, sticky purchase bar.
  main-collection.liquid, main-search.liquid                Grid, facet filters, infinite scroll
                                                             + real <a> pagination fallback.
  main-cart.liquid                                          Cart page (no-JS-safe <form>).
  hero.liquid, banner.liquid, editorial-cards.liquid,
  featured-collection.liquid, reviews-highlight.liquid,
  ugc-gallery.liquid, promo-popup.liquid                    Homepage building blocks (index.json).
  product-reviews.liquid, product-recommendations.liquid,
  recently-viewed.liquid, complete-the-look.liquid          PDP merchandising modules.
  contact-page.liquid, faq-page.liquid, size-guide-page.liquid,
  track-order-page.liquid, main-page.liquid, policy.liquid  Content pages.
  main-404.liquid, password-page.liquid                     Error/gate pages.
  main-login.liquid, main-register.liquid, main-account.liquid,
  main-addresses.liquid, main-order.liquid,
  main-activate-account.liquid, main-reset-password.liquid  Native customer-account pages.

snippets/
  card-product.liquid, price.liquid, badge.liquid,
  sibling-colors.liquid, wishlist-button.liquid              Reusable product-card parts.
  media-gallery.liquid, delivery-estimate.liquid,
  find-my-size.liquid, size-chart-modal.liquid,
  sticky-purchase-bar.liquid                                 PDP parts.
  cart-drawer.liquid, cart-line-item.liquid,
  free-shipping-progress.liquid                              Cart parts.
  quick-add-popover.liquid, quick-view-modal.liquid           Global modal shells (JS-rendered).
  collection-filters.liquid, pagination.liquid                Collection/search parts.
  nav-mega-item.liquid, mobile-drawer.liquid                  Navigation.
  breadcrumbs.liquid, meta-tags.liquid, organization-jsonld.liquid   SEO.
  faq-accordion.liquid, review-summary.liquid, icon.liquid,
  address-fields.liquid, theme-tokens.liquid                  Shared UI/utility.
  integrations/*.liquid                                       Documentation-only adapter files —
                                                                see §7. Never rendered.

assets/
  tokens.css              Static design tokens (fonts, radii, motion, z-index).
  base.css                Reset, typography, breadcrumbs, account-page shell, page-content shell.
  components.css          Buttons, forms, quantity selector, FAQ accordion.
  product-card.css, quick-shop.css, cart-drawer.css,
  collection.css          Global component styles shared across sections (see note below).
  global.js               Nexoira.trapFocus / lockScroll / prefersReducedMotion / formatMoney.
  analytics.js            Nexoira.analytics.track() — see §6.
  cart-store.js            Nexoira.cart.* — Cart AJAX API wrapper + events.
  wishlist-store.js, recently-viewed.js   localStorage-backed, zero-app.
  quick-add.js, quick-view.js, cart-drawer.js   Event-delegated, work anywhere on the page.
  *.woff2                  Self-hosted Inter + Playfair Display (latin + latin-ext).

config/
  settings_schema.json     Theme Settings (global, cross-section) — see §6.
  settings_data.json        Shipped defaults.

locales/
  en.default.json           All UI copy, namespaced (general.navigation, general.product, ...).
```

**Why some CSS lives in `assets/` instead of a section's own `{% stylesheet %}`
block**: any markup rendered by global JS (the cart drawer, quick add/view
popovers) or reused by more than one section (breadcrumbs, the account-page
shell, the FAQ accordion — used by both the FAQ page *and* the PDP's
product-FAQ block) has to be styled globally. A style that only exists in
one section's scoped stylesheet renders unstyled everywhere else that
markup shows up — this was audited explicitly in Phase 10/11 via `shopify
theme check`'s `ValidScopedCSSClass` warning.

---

## 3. Data model: sibling colors

Each color of a product is a **separate product listing**, not a variant.
`snippets/sibling-colors.liquid` links a product to its siblings via the
`custom.sibling_products` metafield (see §4) and reads each sibling's own
`custom.color_name` / `custom.color_swatch` to render the swatch row on the
card and PDP. This means:

- Every color needs its own product, handle, images, inventory, and SEO.
- All siblings should carry the *same* list of sibling references (including
  themselves is harmless — the snippet skips the current product when
  rendering the row).
- Only Size is a real Shopify variant option, per the pricing/sizing table in
  the brand brief (Shirts S–XL, Trousers 28–36, Kurtas S–XXL, all Regular fit).

---

## 4. Admin setup checklist

Nothing below is required for the theme to *push* successfully — it's
required for the storefront to look and work as designed. Everything is
built to render nothing (not a broken placeholder) until it's configured, so
an incomplete setup is safe, just visually sparse.

### 4.1 Collections (Online Store → Collections)

| Collection | Handle | Used by |
|---|---|---|
| Shirts | `shirts` | Theme settings → Primary navigation → Shirts link (default `/collections/shirts`) |
| Kurtas | `kurtas` | Primary navigation → Kurtas link |
| Pants | `pants` | Primary navigation → Pants link |
| *(native "All")* | `all` | Ships pre-wired into the homepage's "New Arrivals" section and the About page's "Shop the Collection" section — no setup needed |
| Bestsellers (or similar) | any | Homepage "Bestsellers" section (`featured-merch`) — pick it in the Theme Editor; renders nothing until you do |
| Casual / Smart Casual / Traditional | any | Optional. Theme settings → Occasions, and the homepage "Shop by Occasion" cards |

### 4.2 Pages (Online Store → Pages)

Create each with the exact template assignment shown, so the matching
section renders:

| Page | Template | Default URL setting |
|---|---|---|
| About | `page.about` | Theme settings → Primary navigation → About link |
| Contact | `page.contact` | Theme settings → Key pages → Contact Us |
| FAQ | `page.faq` | Theme settings → Key pages → FAQ |
| Size Guide | `page.size-guide` | Theme settings → Key pages → Size Guide |
| Track Order | `page.track-order` | Theme settings → Key pages → Track Order |

Any other page (e.g. a plain policy-style page) can use the default `page`
template.

### 4.3 Policies (Settings → Policies)

Fill in Refund, Privacy, Terms of Service, and Shipping policy — the footer
lists whichever ones you've filled in automatically via `shop.policies`, no
page or menu setup needed.

### 4.4 Menus (Online Store → Navigation)

**Nothing is required.** The four primary nav items (Shirts, Kurtas, Pants,
About) are plain URL settings, not a menu, by design — the nav is fixed at
exactly those four. Optionally create up to three menus for the desktop
mega-menu / mobile drawer dropdown under each category, then pick them in
the Header section's settings (Shirts mega menu / Kurtas mega menu / Pants
mega menu). Leave a menu unpicked and that category's nav item is a plain
link with no dropdown.

### 4.5 Product metafield definitions (Settings → Custom data → Products)

All in the `custom` namespace:

| Key | Type | Used for |
|---|---|---|
| `color_name` | Single line text | Sibling-color swatch label (e.g. "Navy Blue") |
| `color_swatch` | Color | Sibling-color swatch dot |
| `color_family` | Single line text | **Recommended** for the collection/search Color filter (see §4.7). Distinct from `color_name` — use a broad family like "Blue", not the specific shade. |
| `sibling_products` | List of products | Links this product to its other colors (§3) |
| `fabric` | Single line text | PDP "Fabric, Fit & Care" accordion |
| `fit` | Single line text | Same accordion |
| `care_instructions` | Single line text | Same accordion |
| `model_info` | Single line text | PDP "Model" accordion (e.g. "Model is 6'0", wearing size M") |
| `complete_the_look` | List of products | PDP "Complete the Look" cross-sell module |
| `size_chart` | Metaobject reference → `size_chart` | PDP size-chart modal |
| `faqs` | List of metaobjects → `faq_item` | PDP product-FAQ accordion |
| `reviews` | List of metaobjects → `review` | PDP reviews + homepage review highlights |

Every field above is optional per-product — the relevant UI (accordion,
button, module) simply doesn't render when it's blank. Never fill these with
placeholder or invented copy; leave them empty instead.

### 4.6 Metaobject definitions (Settings → Custom data → Metaobjects)

**`size_chart`**

| Field | Type |
|---|---|
| `category` | Single line text (e.g. "Shirts") |
| `table` | Rich text |
| `measurement_instructions` | Rich text (optional) |

**`faq_item`**

| Field | Type |
|---|---|
| `question` | Single line text |
| `answer` | Rich text |

**`review`**

| Field | Type |
|---|---|
| `rating` | Integer (1–5) |
| `author_name` | Single line text |
| `body` | Multi-line text |
| `photo` | File — image (optional) |
| `video` | File — video (optional) |
| `verified_purchase` | Boolean |
| `submitted_at` | Date |

Reviews are moderated manually: the PDP's "Write a review" form is a native
Shopify contact form (tagged `product-review`) that emails you — publish a
review by creating a `review` metaobject entry from that email and adding it
to the product's `reviews` metafield. See
`snippets/integrations/reviews-adapter.liquid` for the swap point to a real
reviews app later.

### 4.7 Search & Discovery filters (free, native — not a paid app)

In each collection's Filters settings (or globally under Search &
Discovery), enable filtering on:

- **Price** (built-in)
- **Color** — map `custom.color_family`. The filter section label must
  contain the word "Color" for the swatch-dot UI to activate
  (`snippets/collection-filters.liquid` checks `filter.label contains
  'Color'`). Only these family values render an actual color dot: Black,
  White, Blue, Grey, Green, Red, Brown, Beige — others still filter
  correctly, just with a blank dot.
- **Size** — the Size variant option (built-in)
- **Fit**, **Fabric** — map `custom.fit` / `custom.fabric`
- **Availability** (built-in)

### 4.8 Homepage (`templates/index.json`)

Ships with every section in place but several need content before they
render (each is safely blank, not broken, until then):

- **Hero** — add a real slide image/video (block settings).
- **Bestsellers** (`featured-merch`) — pick a collection.
- **Shop by Category / Shop by Occasion** cards — add images + links per card.
- **Quality / Brand story / Final CTA banners** — add an image and copy.
- **Review highlights** — pick specific `review` metaobject entries as blocks.
- **UGC gallery** — add real Instagram-sourced images with permission; never
  stock/stand-in photos presented as UGC.
- **Promo popup** — off by default (`enable_popup`); turn on and fill in
  content when ready.

---

## 5. Templates → sections reference

| Template | Renders |
|---|---|
| `index.json` | hero, featured-collection ×2, editorial-cards ×2, banner ×3, reviews-highlight, ugc-gallery, promo-popup |
| `product.json` | main-product, product-reviews, complete-the-look, product-recommendations, recently-viewed |
| `collection.json` | main-collection |
| `search.json` | main-search |
| `cart.json` | main-cart, product-recommendations |
| `404.json` | main-404 |
| `password.json` | password-page |
| `page.json` (default) | main-page |
| `page.about.json` | main-page, banner, featured-collection |
| `page.contact.json` | contact-page |
| `page.faq.json` | faq-page |
| `page.size-guide.json` | size-guide-page |
| `page.track-order.json` | track-order-page |
| `templates/policy.liquid` | (plain template, native policy pages) |
| `customers/*.json` | main-login, main-register, main-account, main-addresses, main-order, main-activate-account, main-reset-password |

---

## 6. Theme Editor guide

### Theme settings (global — Theme Editor → Theme settings)

| Group | Controls |
|---|---|
| Logo & favicon | Logo image + width, favicon |
| Colors | Brand accent (curated palette, not freeform — keeps the minimal look consistent), background warmth, text contrast |
| Typography | Type-scale density, heading weight (font pairing itself — Playfair Display + Inter — is fixed) |
| Layout | Max content width, section spacing density |
| Buttons & inputs | Corner style (sharp / soft / pill) |
| Product badges | Sale/New/Bestseller/Low-stock badges — toggle each, "New" day-threshold, low-stock threshold. Sale needs a real compare-at price; Bestseller needs the product tagged `bestseller`; New is automatic from the product's creation date. |
| Cart & shipping | Free-shipping threshold + below-threshold fee (drives the free-shipping progress bar and shipping copy everywhere), COD toggle + conditions note, returns window (days), default delivery estimate (shown on the PDP PIN check — see §7) |
| Social & contact | Support email/phone, Instagram/Facebook URLs, WhatsApp number (used for every WhatsApp support link site-wide) |
| Primary navigation | The four fixed nav links (Shirts/Kurtas/Pants/About) — shared by header and footer |
| Key pages | Size Guide / FAQ / Contact / Track Order URLs — shared by header, mobile drawer, footer |
| Occasions | Optional Casual/Smart Casual/Traditional collection links |

### Per-section settings (Theme Editor → the section itself)

| Section | Key settings |
|---|---|
| Header | Sticky header toggle; per-category mega-menu (pick a menu + optional promo tile image/heading/link) for Shirts/Kurtas/Pants |
| Announcement bar | Auto-rotate, close button; add/edit message blocks (text + optional link) |
| Footer | Tagline, newsletter signup toggle, trust-bar toggle |
| Collection pages | Products per page, desktop column count, filters toggle, infinite-scroll toggle |
| Product information (PDP) | Wishlist button toggle, Find My Size toggle, delivery-PIN-check toggle, Buy Now (dynamic checkout button) toggle, sticky mobile purchase bar toggle |
| Hero | Add slide blocks: image/video, eyebrow, heading, subheading, CTA, text position, text color |
| Banner | Layout (image left/right), image, eyebrow, heading, body, CTA |
| Editorial cards | Heading; add card blocks (image, heading, subtext, link) |
| Featured collection | Heading, collection picker, max products, columns, "View all" toggle, LCP flag (mark true only on the section that's genuinely above the fold first — controls image `fetchpriority`) |
| Reviews highlights | Heading; add blocks by picking specific `review` metaobject entries |
| UGC gallery | Heading, social handle shown; add image blocks (image + optional link) |
| Promo popup | Enable toggle, trigger (time delay / scroll depth / exit intent) + its parameter, frequency cap (days), image, heading, body, email-capture vs. custom-button mode |
| Recently viewed / Related products | Max items shown |
| Size guide page | Add category blocks, each pointing at a `size_chart` metaobject entry |
| FAQ page | Add question blocks (question + rich-text answer) directly — this is separate from the PDP's per-product FAQ metaobjects |
| Password page | Heading, body copy |

---

## 7. App-dependent features & adapters

Every feature below works today with **zero apps**, and is isolated behind
one file so swapping in a real provider later never requires touching
callers elsewhere in the theme. Each adapter file documents its own swap
steps in detail — this is a summary:

| Feature | Native fallback today | Adapter |
|---|---|---|
| Product reviews | `custom.reviews` metaobjects, manually curated from emailed submissions | `snippets/integrations/reviews-adapter.liquid` |
| Wishlist | localStorage only, no cross-device sync, no guest→account merge | `snippets/integrations/wishlist-sync-adapter.liquid` |
| Delivery estimate | 6-digit PIN format validation + one merchant-configured default estimate (no real per-pincode ETA) | `snippets/integrations/delivery-estimate-adapter.liquid` |
| Order tracking | Points to account order history + the courier link in Shopify's own shipping-confirmation email (no public guest order-lookup endpoint exists without an app) | `snippets/integrations/track-order-adapter.liquid` |
| Find My Size | Generic standard menswear chest/waist ranges, explicitly disclosed as an estimate, always links back to the real size chart | `snippets/integrations/find-my-size-adapter.liquid` |

None of these are stubbed UI — each one either fully works as described, or
doesn't render at all until configured. Nothing here ever blocks browsing,
Add to Cart, or checkout if it fails or is absent.

---

## 8. Analytics

`assets/analytics.js` exposes one call site: `Nexoira.analytics.track(name,
payload)`. It fans out to:

1. `window.dataLayer.push({ event: name, ...payload })` — works the moment a
   merchant adds Google Tag Manager or gtag.js, no theme change needed.
2. `Shopify.analytics.publish(name, payload)` — Shopify's native,
   consent-aware pixel bus, picked up automatically by a Custom Pixel
   extension if one is ever added.

Both are wrapped in `try/catch` and are purely additive — nothing about
cart, checkout, or browsing depends on either succeeding.

**Standard commerce events are already tracked automatically** by Shopify
(page views, product views, collection views, search, add-to-cart, checkout
started) because `content_for_header` is present in both layouts — nothing
to configure. The table below is only the theme's *custom* events, for
interactions Shopify doesn't track natively:

| Event | Payload | Fires when |
|---|---|---|
| `add_to_cart` | `variant_id, product_id, quantity, price` | An item is successfully added via the Cart AJAX API (PDP, Quick Add, Quick View) |
| `remove_from_cart` | `line_key` | A cart line's quantity is set to 0 |
| `wishlist_add` / `wishlist_remove` | `product_id` | The wishlist heart is toggled |
| `quick_view_open` | `product_handle` | Quick View modal opens |
| `filter_applied` | `name, value` | A collection/search facet checkbox or range input changes |
| `predictive_search` | `query, result_count` | A predictive-search request completes |
| `promo_popup_shown` | `trigger` | The homepage popup becomes visible |
| `promo_popup_dismissed` | *(none)* | The popup is closed |
| `promo_popup_submitted` | *(none)* | The popup's email-capture form is submitted |
| `promo_popup_cta_click` | *(none)* | The popup's non-email CTA button is clicked |
| `support_link_click` | `channel, source` | Any WhatsApp/email/phone support link is clicked (channel: `whatsapp`/`email`/`phone`; source: `contact_page`/`footer`/`track_order_page`) |

Any element anywhere can opt into this system with no JS changes:
`<button data-analytics-event="my_event" data-analytics-payload='{"key":"value"}'>`.

---

## 9. Performance, SEO & accessibility (built-in, not bolted on)

- **Images**: responsive `srcset`/`sizes` via `image_url`, explicit
  width/height everywhere (no CLS), `loading="lazy"` below the fold,
  `fetchpriority="high"` reserved for the true LCP image only (hero first
  slide, PDP first gallery image, first collection-grid card) — never the
  header logo.
- **Fonts**: self-hosted Inter + Playfair Display (latin + latin-ext, for
  the ₹ glyph), preloaded via the `preload_tag` filter, zero runtime
  requests to a font CDN.
- **Scripts**: every asset loads `defer`; nothing render-blocks.
- **SEO**: per-template canonical + title + meta description, Product /
  BreadcrumbList / Organization JSON-LD (real data only — price and
  availability come straight from the variant, ratings only appear when
  real `custom.reviews` entries exist), site-wide OG/Twitter meta, real
  crawlable pagination behind infinite scroll, `noindex` on faceted
  collection URLs.
- **Accessibility**: keyboard-operable nav/drawers/modals/filters/Quick
  View/purchase controls via a shared focus-trap utility, visible focus
  states, labelled icon-only buttons, `prefers-reduced-motion` respected,
  a real `<input type="radio">` size selector (works with JS off), a skip
  link, and heading hierarchy verified end-to-end (product-card titles are
  a styled `<p>`, not a heading, since the same card renders under h1 or h2
  contexts depending on the page).
- **Validated with `shopify theme check`**: 0 errors, 0 warnings as of the
  last commit on this branch.

---

## 10. Known limitations / what's intentionally left undone

- **No live Shopify store was available to render-test this theme against**
  during development — every phase was validated via static analysis
  (`shopify theme check`, a custom Liquid/JSON/CSS/JS balance-and-pattern
  checker) rather than a real browser. Do a full click-through in a
  development store before going live, especially: checkout handoff, the
  customer account flows, and the cart drawer on a real network.
- **Delivery estimates, order tracking, and reviews are all deliberately
  simple native fallbacks**, not full-featured versions of what a paid app
  would offer — see §7. This is by design for a zero-app Basic-plan launch,
  not an oversight.
- **The homepage, About page, and several PDP modules render empty until
  merchandised** — see §4.8. This is intentional ("if it can't work yet, it
  doesn't render") rather than a bug.
- **No blog/article templates** — out of scope per the brand brief.
- **Multi-currency / multi-language** — out of scope; the brand is
  India-only, INR-only, English-only.
