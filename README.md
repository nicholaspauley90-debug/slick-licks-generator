# slick-licks-generator
Slick Licks T-Shirt business generator

## Store & Checkout

The site lists products from `products.js` and sells them via Stripe Checkout.
When a payment completes, an order notification email (product/set, size,
customer, and shipping address) is sent to `slicklickslabs@gmail.com` via
Resend.

### Adding a new product/set

Add an entry to the `products` array in `products.js`:

```js
{
  id: "unique-slug",
  name: "Set Name",
  price: 2500, // price in cents
  description: "...",
  sizes: ["S", "M", "L", "XL", "XXL"],
}
```

### Required environment variables

- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - signing secret for the `/webhook/stripe` endpoint
- `RESEND_API_KEY` - Resend API key used to send order notification emails
- `OPENAI_API_KEY` - OpenAI API key (design/content generation)
- `REPLICATE_API_TOKEN` - Replicate API token (design generation)

### Stripe webhook setup

Point a Stripe webhook at `https://<your-domain>/webhook/stripe` listening
for the `checkout.session.completed` event, then set `STRIPE_WEBHOOK_SECRET`
to the signing secret Stripe gives you for that endpoint.

### Deploying to Render

A `render.yaml` blueprint is included. Connect this repo in the Render
dashboard and set the environment variables listed above (they're left
unset in the blueprint so secrets aren't committed to the repo).
