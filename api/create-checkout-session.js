import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const COOKIE_NAME = "yc_sess";

function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}
function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(part => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}
function readSession(req) {
  const secret = process.env.ATTEMPT_SIGNING_SECRET;
  if (!secret) return null;

  const cookies = parseCookies(req);
  const raw = cookies[COOKIE_NAME];
  if (!raw || !raw.includes(".")) return null;

  const [payloadB64, sig] = raw.split(".");
  const expected = sign(payloadB64, secret);
  if (sig !== expected) return null;

  try {
    return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { priceId, quantity = 1, qid, visitId } = req.body || {};
    if (!priceId) return res.status(400).json({ error: "Missing priceId" });
    if (!qid || !visitId) return res.status(400).json({ error: "Missing qid/visitId" });

    // ✅ Hard block server-side (cannot be bypassed by refresh)
    const session = readSession(req);
    if (!session || !session.attempts) {
      return res.status(401).json({ error: "No valid session. Reload checkout page." });
    }

    const k = `${priceId}__${qid}`;
    const state = session.attempts[k];

    const MAX_ATTEMPTS = 3;
    if (!state || state.visitId !== visitId) {
      return res.status(403).json({ error: "Entry not initialised. Go back and click Enter again." });
    }
    if (state.attempts >= MAX_ATTEMPTS) {
      return res.status(403).json({ error: "Too many failed attempts. Entry locked." });
    }
    if (!state.passed) {
      return res.status(403).json({ error: "Skill question not passed." });
    }

    const baseUrl = "https://yourcomps.vercel.app";

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    return res.status(200).json({ url: stripeSession.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
