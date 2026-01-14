import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * In-memory attempt store
 * (safe for now, upgradeable later)
 */
const ATTEMPT_LIMIT = 3;
const attemptsStore = new Map();

/**
 * Get or create a session ID
 */
function getSessionId(req, res) {
  let sid = req.cookies?.sid;

  if (!sid) {
    sid = crypto.randomUUID();
    res.setHeader(
      "Set-Cookie",
      `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
  }

  return sid;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { priceId, quantity = 1, qid, passed } = req.body;

    if (!priceId || !qid) {
      return res.status(400).json({ error: "Missing data" });
    }

    const sessionId = getSessionId(req, res);
    const key = `${sessionId}:${priceId}:${qid}`;

    const record = attemptsStore.get(key) || { attempts: 0 };

    // ❌ Block if attempts exhausted
    if (record.attempts >= ATTEMPT_LIMIT) {
      return res.status(403).json({
        error: "Maximum attempts exceeded",
      });
    }

    // ❌ If answer failed, record attempt and block checkout
    if (!passed) {
      record.attempts += 1;
      attemptsStore.set(key, record);

      return res.status(403).json({
        error: "Incorrect answer",
        attemptsRemaining: ATTEMPT_LIMIT - record.attempts,
      });
    }

    // ✅ Passed → reset attempts
    attemptsStore.delete(key);

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
    return res.status(500).json({ error: "Server error" });
  }
}
