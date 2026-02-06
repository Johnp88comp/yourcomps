import Stripe from "stripe";
import { ObjectId } from "mongodb";
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
    console.error("❌ Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only care about successful payments
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await handleSuccessfulPayment(session);
    } catch (err) {
      console.error("❌ Webhook processing error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }

  // Always respond to Stripe
  res.status(200).json({ received: true });
}


/* ===============================
   HANDLE SUCCESSFUL PAYMENT
================================ */

async function handleSuccessfulPayment(session) {
  const client = await clientPromise;
  const db = client.db("yourcomps");

  const metadata = session.metadata || {};

  const { competitionId, userId, quantity } = metadata;

  if (!competitionId || !userId || !quantity) {
    throw new Error("Missing required metadata in Stripe session");
  }

  const quantityNum = Number(quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) {
    throw new Error("Invalid quantity value");
  }

  const competitionObjectId = new ObjectId(competitionId);

  const entries = db.collection("entries");
  const competitions = db.collection("competitions");

  // Create entry documents
  const entryDocs = Array.from({ length: quantityNum }).map(() => ({
    competitionId: competitionObjectId,
    userId,
    createdAt: new Date(),
    paymentIntent: session.payment_intent,
  }));

  await entries.insertMany(entryDocs);

  await competitions.updateOne(
    { _id: competitionObjectId },
    { $inc: { entriesCount: quantityNum } }
  );

  console.log(`✅ ${quantityNum} entries created for user ${userId}`);
}


/* ===============================
   RAW BODY READER
================================ */

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
