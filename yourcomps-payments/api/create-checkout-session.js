import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Safe defaults so req.body being undefined never crashes the function
    const {
      title = "Test Checkout",
      price = 200,      // price in pence (£2.00)
      quantity = 1
    } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: title },
            unit_amount: Number(price),
          },
          quantity: Number(quantity),
        },
      ],
      success_url: "https://yourcomps-payments.vercel.app/success.html",
      cancel_url: "https://yourcomps-payments.vercel.app/cancel.html",
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("STRIPE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
