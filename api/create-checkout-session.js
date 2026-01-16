import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔐 Used to verify skill-question pass tokens
const ATTEMPT_SIGNING_SECRET = process.env.ATTEMPT_SIGNING_SECRET;

function verifyToken({ priceId, qid, token }) {
  if (!priceId || !qid || !token) return false;

  const expected = crypto
    .createHmac("sha256", ATTEMPT_SIGNING_SECRET)
    .update(`${priceId}:${qid}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(token)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { priceId, quantity = 1, qid, token } = req.body || {};

    if (!priceId || !qid || !token) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🚫 HARD BLOCK: skill question must be passed
    const valid = verifyToken({ priceId, qid, token });
    if (!valid) {
      return res.status(403).json({ error: "Skill verification failed" });
    }

    const baseUrl = "https://yourcomps.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
