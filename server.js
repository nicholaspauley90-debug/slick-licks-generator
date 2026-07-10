import { Hono } from "hono";
import { serve } from "@hono/node-server";
import Stripe from "stripe";
import { Resend } from "resend";
import { products } from "./products.js";

const port = process.env.PORT || 8080;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const ORDER_NOTIFICATION_EMAIL = "slicklickslabs@gmail.com";

const app = new Hono();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatUsd(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function baseUrl(c) {
  const proto = c.req.header("x-forwarded-proto") || "https";
  const host = c.req.header("host");
  return `${proto}://${host}`;
}

app.get("/", (c) => {
  const cards = products
    .map((product) => {
      const sizeOptions = product.sizes
        .map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`)
        .join("");
      return `
        <div class="card">
          <h2>${escapeHtml(product.name)}</h2>
          <p class="price">${formatUsd(product.price)}</p>
          <p class="description">${escapeHtml(product.description).replace(/\n/g, "<br>")}</p>
          <form method="POST" action="/checkout">
            <input type="hidden" name="productId" value="${escapeHtml(product.id)}">
            <label for="size-${escapeHtml(product.id)}">Size</label>
            <select id="size-${escapeHtml(product.id)}" name="size" required>
              ${sizeOptions}
            </select>
            <button type="submit">Buy Now</button>
          </form>
        </div>
      `;
    })
    .join("");

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Slick Licks</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; background: #111; color: #eee; margin: 0; padding: 20px; }
        .container { max-width: 700px; margin: 0 auto; }
        h1 { text-align: center; }
        .card { background: #1c1c1c; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .price { font-size: 1.4em; font-weight: bold; color: #4facfe; }
        .description { white-space: pre-line; line-height: 1.5; color: #ccc; }
        select, button { padding: 10px; font-size: 1em; margin-top: 10px; border-radius: 5px; border: none; }
        button { background: #4facfe; color: white; cursor: pointer; font-weight: bold; margin-left: 10px; }
        button:hover { background: #00c2fe; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SLICK LICKS</h1>
        ${cards}
      </div>
    </body>
    </html>
  `);
});

app.post("/checkout", async (c) => {
  const body = await c.req.parseBody();
  const product = products.find((p) => p.id === body.productId);
  const size = body.size;

  if (!product || !product.sizes.includes(size)) {
    return c.text("Invalid product or size", 400);
  }

  const origin = baseUrl(c);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: `Size: ${size}`,
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    shipping_address_collection: { allowed_countries: ["US"] },
    metadata: {
      productId: product.id,
      productName: product.name,
      size,
    },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel`,
  });

  return c.redirect(session.url, 303);
});

app.get("/success", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head><title>Order Confirmed - Slick Licks</title></head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
      <h1>Thank you for your order!</h1>
      <p>We'll get your mystery drop shipped out soon.</p>
      <a href="/">Back to shop</a>
    </body>
    </html>
  `);
});

app.get("/cancel", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head><title>Order Cancelled - Slick Licks</title></head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
      <h1>Checkout cancelled</h1>
      <a href="/">Back to shop</a>
    </body>
    </html>
  `);
});

async function sendOrderNotification(session) {
  const { productName, size } = session.metadata || {};
  const customer = session.customer_details || {};
  const shipping = session.shipping_details || session.shipping || {};
  const address = shipping.address || {};

  const html = `
    <h2>New Slick Licks Order</h2>
    <p><strong>Product/Set:</strong> ${escapeHtml(productName || "Unknown")}</p>
    <p><strong>Size:</strong> ${escapeHtml(size || "Unknown")}</p>
    <p><strong>Amount Paid:</strong> ${formatUsd(session.amount_total || 0)}</p>
    <p><strong>Customer Email:</strong> ${escapeHtml(customer.email || "N/A")}</p>
    <p><strong>Customer Name:</strong> ${escapeHtml(shipping.name || customer.name || "N/A")}</p>
    <p><strong>Shipping Address:</strong><br>
      ${escapeHtml(address.line1 || "")}<br>
      ${address.line2 ? escapeHtml(address.line2) + "<br>" : ""}
      ${escapeHtml(address.city || "")}, ${escapeHtml(address.state || "")} ${escapeHtml(address.postal_code || "")}<br>
      ${escapeHtml(address.country || "")}
    </p>
    <p><strong>Stripe Session ID:</strong> ${escapeHtml(session.id)}</p>
  `;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: ORDER_NOTIFICATION_EMAIL,
    subject: `New Order: ${productName || "Slick Licks"} (Size ${size || "?"})`,
    html,
  });
}

app.post("/webhook/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return c.text(`Webhook Error: ${err.message}`, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      await sendOrderNotification(session);
    } catch (err) {
      console.error("Failed to send order notification email:", err);
    }
  }

  return c.json({ received: true });
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`Slick Licks server listening on port ${port}`);
});
