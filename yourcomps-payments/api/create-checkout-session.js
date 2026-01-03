import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: "Test Checkout" },
            unit_amount: 200
          },
          quantity: 1
        }
      ],
      success_url: "https://yourcomps-payments.vercel.app/success.html",
      cancel_url: "https://yourcomps-payments.vercel.app/cancel.html"
    });

    res.status(200).json({ url: session.url });

  catch (err) {
  console.error("STRIPE ERROR FULL:", err);
  res.status(500).json({
    error: err.message,
    type: err.type,
    code: err.code
  });
}

