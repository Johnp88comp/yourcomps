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

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(token, "hex")
  );
}

/* ===============================
   API HANDLER
=============================== */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { priceId, quantity = 1, qid, token } = req.body || {};

    if (!priceId || !qid || !token) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔒 HARD BLOCK: must pass skill question
    const valid = verifyToken(priceId, qid, token);
    if (!valid) {
      return res.status(403).json({ error: "Skill verification failed" });
    }

    const baseUrl = "https://yourcomps.vercel.app";

    const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",
  line_items: [
    {
      price: priceId,
      quantity: ticketQuantity,
    },
  ],
  success_url: `${BASE_URL}/success.html`,
  cancel_url: `${BASE_URL}/cancel.html`,
  metadata: {
    competitionId,
    userId,
    quantity: ticketQuantity.toString(),
    entryType: "paid",
  },
   });


    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Stripe session failed" });
  }
}
