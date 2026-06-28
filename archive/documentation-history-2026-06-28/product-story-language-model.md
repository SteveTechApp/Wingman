# Product story language model

This pass adds a reusable product story wording layer for Wingman.

## Purpose

Product wording should explain the product role, not just list a generic description.

Each product story should help a salesperson understand:

- what the product is;
- why it exists;
- what customer problem it solves;
- where it fits;
- what features matter;
- what to check before quoting;
- what to say in a customer-safe way.

## Primary focus

The first implementation focuses on NetworkHD / NHD because those products are system architecture components.

The language separates:

- NetworkHD 100 cost-effective AV-over-IP;
- NetworkHD 500 premium 1GbE 4K60 4:4:4 AV-over-IP;
- NetworkHD 600 10G lossless / zero-latency AV-over-IP;
- transmitters / encoders;
- receivers / decoders;
- controllers;
- multiview products;
- NDI / H.265 bridge products.

## Files added

- `src/wingman2/lib/productStoryLanguage.ts`
- `src/wingman2/components/workflow/ProductStoryLanguageEnhancer.tsx`

## UI behaviour

The enhancer adds product story panels on product, finder, compare and project pages where product/SKU cards are detected.

This is intentionally safe and non-destructive. It does not remove existing product data. It adds better purpose-led wording above or near existing product content.

## Recommended next pass

Move from DOM enhancement to native React usage in:

1. ProductCallCardsPage
2. ProductPitchPage
3. ProductFinder / Products page
4. ComparePageNew

Use `getProductStoryForSku()` directly inside those pages so the story layer becomes the main source for:

- What it is
- What it does
- How to sell
- Key facts
- Check before quoting
- Internal guidance