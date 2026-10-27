# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon TCG shoppers and collectors browsing single cards, sealed products, and accessories.

## Product Purpose

An online storefront for discovering Pokémon TCG products, placing orders, and managing purchases and account activity.

## Positioning

No differentiating mechanism or competitive claim has been confirmed. Do not invent one.

## Operating Context

Customers browse and filter the catalog, add products to a local cart, sign in, choose delivery and payment details, and review an order. Signed-in customers can also view orders, points, notifications, profile details, and support conversations.

## Capabilities and Constraints

- The frontend is a Next.js 16, React 19, TypeScript, and Bun application.
- It consumes the modular `/api/v2` backend through a same-origin Next.js proxy. Responses are validated with Zod and normalized from `{ data, meta }`.
- Cart state is local. The backend revalidates price, product version, stock, delivery, and order totals during preview and order creation.
- Checkout requires an authenticated user with a verified email address.
- The customer storefront and the administrative CMS have separate layouts and authentication; this product record and its visual work concern the customer storefront.

## Brand Commitments

- The current storefront identity is Nevada TCG.
- The shop is focused on Pokémon trading cards and related collectibles.

## Evidence on Hand

- Product records and their real merchandise imagery are supplied by the catalog API.
- The repository includes local Pokémon sprite artwork at `public/images/pokemon/` and source notes at `public/images/pokemon/SOURCES.md`.
- No customer testimonials, sales figures, service-level claims, or differentiating business claims have been confirmed.

## Product Principles

- Keep product imagery distinct from decorative Pokémon character artwork.
- Keep catalog, cart, checkout, authentication, and account tasks clear and functional.
- Preserve backend-validated prices, stock, delivery, and totals in the purchase flow.
- Do not add unverified product or business claims.
