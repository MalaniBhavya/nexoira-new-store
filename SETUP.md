# Nexoira theme — store setup

The theme is the front end. A few things live in the Shopify admin rather
than in code, and the storefront will look half-finished until they're
filled in. This is that list, in the order worth doing it.

---

## 1. Theme settings

Online Store → Themes → Customize → **Theme settings**.

| Group | Fill in |
|---|---|
| Brand | Brand name, tagline, logo, mobile logo, favicon, social sharing image |
| Colors | Already set to the brand palette — change only if the brand does |
| Cart | Free shipping threshold (**must match your real shipping rate** — see §5) |
| Contact | Support email, phone, hours, WhatsApp number + default message |
| Social media | Instagram URL and handle, Facebook, YouTube |
| Integrations | Wishlist / reviews / pincode toggles — see §7 |

Blank contact fields are hidden everywhere they'd appear (footer, contact
page, track order page, WhatsApp button). Nothing is hard-coded, so a
blank field is a hidden field, never a placeholder.

---

## 2. Pages to create

Content → Pages → Add page, then set the **theme template** on each.

| Page title | Handle | Template |
|---|---|---|
| About Us | `about` | `page.about` |
| Contact Us | `contact` | `page.contact` |
| FAQs | `faq` | `page.faq` |
| Size Guide | `size-guide` | `page.size-guide` |
| Track Order | `track-order` | `page.track-order` |

Policy pages are **not** theme pages. Write them under Settings → Policies
and Shopify serves them at `/policies/...`. The footer already links
there, and the product page's Shipping & returns accordion pulls its text
from your shipping policy (falling back to your refund policy, then to
the section setting).

---

## 3. Navigation

Content → Navigation. The header renders whatever menu you point it at —
there are no hard-coded links.

Suggested main menu:

```
New Arrivals   /collections/new-arrivals
Shirts         /collections/shirts
Trousers       /collections/pants
Kurtas         /collections/kurtas
Best Sellers   /collections/best-sellers
Shop           /collections/all
  └ Shirts, Trousers, Kurtas, New Arrivals   (sub-links)
```

A top-level link with sub-links becomes a dropdown. To make one a
full-width mega menu with an image, add a **Mega menu** block to the
header section and type that link's name into it.

---

## 4. Collections

Existing: `shirts`, `pants` (Trousers), `kurtas`, `new-arrivals`,
`best-sellers`.

**Best Sellers** is a smart collection: every product by vendor `Nexoira
Supply`, with the collection's sort order set to **Best selling**. It is
already selected in the homepage's "Most Wanted" section.

Two things worth knowing about it:

- The store has **no orders yet**, so Shopify has no sales data to sort
  by and the current order is arbitrary — right now it leads with kurtas.
  It corrects itself automatically as orders come in; nothing needs
  changing.
- Because it's rule-based rather than hand-picked, nothing claims to be
  popular that isn't. If you would rather curate it, change the rule to
  `Product tag is equal to Best Seller` and tag the pieces you want —
  but only tag what genuinely sells, or the section becomes a fiction.

Give each collection an image and a short description; the collection
template uses both.

---

## 5. Shipping, payments and the ₹999 threshold

The theme **displays** a free shipping threshold; it does not create one.
Set the actual rate in Settings → Shipping and delivery (a free rate with
a ₹999 minimum order value), then set the same number in Theme settings →
Cart. If the two disagree, the progress bar will lie to shoppers.

Likewise, the payment methods named in the FAQ answer are described as
"whatever is shown at checkout" rather than claimed. Whether COD, UPI,
cards, net banking and wallets are actually available depends entirely on
Settings → Payments.

---

## 6. Filters (Search & Discovery)

Install Shopify's free **Search & Discovery** app and add filters. The
collection template renders whatever you configure — no theme change
needed for a new filter.

Worth enabling for this catalogue:

| Filter | Source |
|---|---|
| Size | Product option `Size` |
| Colour | Product tag (colour is a separate product here, not an option) |
| Price | Built-in |
| Availability | Built-in |
| Fabric | Product tag, or the `shopify.fabric` metafield |
| Occasion | Product tag (`Casual`, `Formal`, `Festive`) |

---

## 7. Metafields

### Already defined in this store, and used by the theme

| Namespace.key | Type | Where it shows |
|---|---|---|
| `custom.material_care` | multi-line text | Product page → Fabric & care accordion |
| `custom.size_fit` | multi-line text | Product page → Size & fit accordion |
| `custom.color_name` | single-line text | Swatch label, colour line on the product page |
| `custom.color_swatch` | colour | Swatch dot |
| `custom.sibling_products` | product list | Colour swatches across products |

`custom.sibling_products` is what makes colour swatches work. Because a
Nexoira shirt has only a **Size** option and each colour is its own
product, the swatch row is built by linking the colour variations to each
other. Add every colour of a style to each product's sibling list
(including itself, so the current colour shows as selected), and set
`custom.color_name` and `custom.color_swatch` on each.

### Worth adding

| Namespace.key | Type | Purpose |
|---|---|---|
| `custom.size_guide` | rich text, or metaobject reference with a `chart` field | Per-product size chart that overrides the generic ones |
| `reviews.rating` / `reviews.rating_count` | rating / integer | Written by review apps; drives stars and rating schema |

Shopify's standard product metafields (`shopify.fabric`, `shopify.fit`,
`shopify.sleeve-length-type`, `shopify.neckline`,
`shopify.pants-length-type`, `shopify.color-pattern`) are already on the
products and are best used as **filters** via Search & Discovery rather
than as theme copy.

---

## 8. What needs an app

Five features are integration points, not fake implementations. Each one
degrades honestly when no app is installed.

| Feature | Without an app | With an app |
|---|---|---|
| **Wishlist** | Saves to the shopper's own browser only. Never claims to sync to their account. | Call `Nexoira.wishlist.setAdapter({has, toggle, count})`, or listen for `nexoira:wishlist:toggle` and cancel the event. Point Header → "Wishlist page URL" at the app's page. |
| **Reviews** | The reviews section renders **nothing** on the storefront. No stars, no `aggregateRating` schema. | Add the app's block to the Customer reviews section, and turn on Theme settings → Integrations → reviews. Stars appear once `reviews.rating` has real values. |
| **Pincode check** | Hidden by default. When on, it validates the PIN code format and points at the shipping policy — it never invents a delivery date. | Listen for `nexoira:pincode:check` on the widget, `preventDefault()`, and write your answer into `event.detail.resultElement`. |
| **Order tracking** | The Track Order page explains the two routes that genuinely work: the courier link in the shipping email, and the customer's account. | Add the app's block to the Track order section; it renders above the fallback options. |
| **Instagram feed** | Shows merchant-curated images that never break. | Add the feed app's block to the Instagram section and it takes over the grid. |

Instagram deliberately has no API integration: Basic Display needs
server-side token refresh, which a theme cannot do, so a hard-coded feed
stops working within weeks.

---

## 9. Running the checks yourself

CI runs two jobs on every push and pull request (`.github/workflows/ci.yml`):

- **Theme Check** — Shopify's official linter, annotating changed lines on
  the PR. Fails on errors; warnings are reported without blocking.
- **Theme structure** — the things theme-check does not cover: JSON
  templates pointing at sections that do not exist, missing snippets or
  assets, unbalanced Liquid tags, duplicate CSS rules, and JS syntax.

Both run locally:

```sh
npx @shopify/cli theme check          # Shopify's linter
python3 .github/scripts/validate_theme.py   # structural checks
```

There is one standing Theme Check warning, `RemoteAsset`, six times over.
Playfair Display and Inter load from Google Fonts, and the check would
rather every asset came from Shopify's CDN. The check is left enabled
rather than silenced so the point stays visible; see `.theme-check.yml`.

---

## 10. Things the theme will not do

Worth knowing before someone asks for them:

- **No fabricated social proof.** No sample reviews, no placeholder
  ratings, no `aggregateRating` schema without real review data.
- **No fake urgency.** No countdown timers, no "12 people viewing", no
  invented low-stock warnings.
- **No invented logistics.** No delivery-date promises, no shipping-time
  claims beyond what Shopify calculates at checkout.
- **No replacement checkout.** Checkout stays Shopify-native throughout.
