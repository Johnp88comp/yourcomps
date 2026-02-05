import Stripe from "stripe";
import clientPromise from "../lib/mongodb.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await handleSuccessfulPayment(session);
    } catch (err) {
      console.error("❌ Webhook processing error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }

  res.json({ received: true });
}

/* ---------------- HELPERS ---------------- */

async function handleSuccessfulPayment(session) {
  const client = await clientPromise;
  const db = client.db("yourcomps");

  const {
    competitionId,
    userId,
    quantity,
  } = session.metadata;

  const entries = db.collection("entries");
  const competitions = db.collection("competitions");

  const quantityNum = Number(quantity);

  // Create entries
  const docs = Array.from({ length: quantityNum }).map(() => ({
    competitionId,
    userId,
    createdAt: new Date(),
    paymentIntent: session.payment_intent,
  }));

  await entries.insertMany(docs);

  // Increment competition entry count
  await competitions.updateOne(
    { _id: new db.bson.ObjectId(competitionId) },
    { $inc: { entriesCount: quantityNum } }
  );

  console.log(`✅ ${quantityNum} entries created for user ${userId}`);
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
