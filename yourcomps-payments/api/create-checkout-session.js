import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Competition Ticket",
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      success_url: "https://yourcomps-payments.vercel.app/success.html",
      cancel_url: "https://yourcomps-payments.vercel.app/cancel.html",
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to start payment" });
  }
}
