import crypto from "crypto";

const SECRET = process.env.ATTEMPT_SIGNING_SECRET;
const MAX_ATTEMPTS = 3;

// very simple in-memory store (Vercel-safe for now)
const attempts = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { priceId, qid, visitId, answer } = req.body || {};

  if (!priceId || !qid || !visitId || !answer) {
    return res.status(400).json({ error: "Missing data" });
  }

  const key = `${priceId}:${qid}:${visitId}`;
  const current = attempts.get(key) || 0;

  if (current >= MAX_ATTEMPTS) {
    return res.status(403).json({ locked: true });
  }

  // ⚠️ correct answers MUST match your question pool
  const ANSWERS = {
    time_math: "12:30",
    simple_addition: "12"
  };

  if (ANSWERS[qid] !== answer) {
    const next = current + 1;
    attempts.set(key, next);

    return res.json({
      correct: false,
      remaining: MAX_ATTEMPTS - next
    });
  }

  // ✅ Correct — issue signed token
  const token = crypto
    .createHmac("sha256", SECRET)
    .update(`${priceId}:${qid}:${visitId}`)
    .digest("hex");

  // cleanup
  attempts.delete(key);

  return res.json({
    correct: true,
    token,
    visitId
  });
}
