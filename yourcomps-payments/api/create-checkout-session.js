import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Safe destructuring with defaults
    const {
      title = "Test Checkout",
      price = 200,      // pence
      quantity = 1
    } = req.body || {};

    console.log(
      "STRIPE KEY CHECK:",
      typeof process.env.STRIPE_SECRET_KEY,
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_"),
      process.env.STRIPE_SECRET_KEY?.length
    );

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
    return res.status(500).json({ error: err.message || "Stripe error" });
  }
}
