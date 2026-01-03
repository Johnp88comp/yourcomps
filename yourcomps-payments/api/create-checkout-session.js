import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    console.log("STRIPE KEY PRESENT:", !!stripeKey);
    console.log("STRIPE KEY STARTS sk_:", stripeKey?.startsWith("sk_"));
    console.log("STRIPE KEY LENGTH:", stripeKey?.length);

    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: "Test Checkout" },
            unit_amount: 200,
          },
          quantity: 1,
        },
      ],
      success_url: "https://yourcomps-payments.vercel.app/success.html",
      cancel_url: "https://yourcomps-payments.vercel.app/cancel.html",
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("FULL STRIPE ERROR:", err);
    return res.status(500).json({
      error: err.message,
      type: err.type,
      code: err.code,
    });
  }
}
