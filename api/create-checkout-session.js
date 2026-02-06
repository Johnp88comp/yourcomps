import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SECRET = process.env.ATTEMPT_SIGNING_SECRET;

if (!SECRET) {
  throw new Error("ATTEMPT_SIGNING_SECRET is not set");
}

/* ===============================
   VERIFY SKILL TOKEN
=============================== */
function verifyToken(priceId, qid, token) {
  if (!priceId || !qid || !token) return false;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(`${priceId}:${qid}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(token, "hex")
    );
  } catch {
    return false;
  }
}

/* ===============================
   API HANDLER
=============================== */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      priceId,
      competitionId,
      userId,
      quantity = 1,
      qid,
      token
    } = req.body || {};

    if (!priceId || !competitionId || !userId || !qid || !token) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔒 MUST PASS SKILL QUESTION
    const valid = verifyToken(priceId, qid, token);
    if (!valid) {
      return res.status(403).json({ error: "Skill verification failed" });
    }

    const baseUrl = "https://yourcomps.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],

      metadata: {
        competitionId,
        userId,
        quantity: String(quantity),
        entryType: "paid"
      },

      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Stripe session failed" });
  }
}

