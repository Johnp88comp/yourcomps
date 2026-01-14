import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * TEMP server-side attempt store
 * (Resets on redeploy – OK for now)
 */
const ATTEMPT_STORE = {};
const MAX_ATTEMPTS = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { priceId, quantity = 1, qid, sessionId } = req.body;

    if (!priceId || !qid || !sessionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const attemptKey = `${sessionId}_${priceId}_${qid}`;

    const attempts = ATTEMPT_STORE[attemptKey] || 0;

    if (attempts >= MAX_ATTEMPTS) {
      return res.status(403).json({
        error: "Skill question attempts exceeded"
      });
    }

    // 🔐 Lock attempts once checkout is allowed
    ATTEMPT_STORE[attemptKey] = MAX_ATTEMPTS;

    const baseUrl = "https://yourcomps.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity
        }
      ],
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        competition_price: priceId,
        question_id: qid,
        session_id: sessionId
      }
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
