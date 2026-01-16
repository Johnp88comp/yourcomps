import crypto from "crypto";

const QUESTIONS = {
  time_math: {
    answer: "12:30"
  },
  simple_addition: {
    answer: "12"
  }
};

const MAX_ATTEMPTS = 3;
const ATTEMPT_SIGNING_SECRET = process.env.ATTEMPT_SIGNING_SECRET;

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { priceId, qid, answer, attemptCount } = req.body;

  if (!priceId || !qid || !answer) {
    return res.status(400).json({ error: "Missing data" });
  }

  if (!QUESTIONS[qid]) {
    return res.status(400).json({ error: "Invalid question" });
  }

  if (attemptCount >= MAX_ATTEMPTS) {
    return res.status(403).json({ error: "Attempts exhausted" });
  }

  if (answer !== QUESTIONS[qid].answer) {
    return res.status(200).json({ correct: false });
  }

  // ✅ Correct → issue signed token
  const token = crypto
    .createHmac("sha256", ATTEMPT_SIGNING_SECRET)
    .update(`${priceId}:${qid}`)
    .digest("hex");

  res.status(200).json({
    correct: true,
    token
  });
}
