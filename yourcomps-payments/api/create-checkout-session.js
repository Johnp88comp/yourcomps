import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Competition Tickets",
            },
            unit_amount: 1000, // £10.00
          },
          quantity: 1,
        },
      ],
      success_url: "https://yourcomps-payments-583sgpduw-john-purvis-projects.vercel.app/success.html",
      cancel_url: "https://yourcomps-payments-583sgpduw-john-purvis-projects.vercel.app/cancel.html",
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe session failed" });
  }
}
