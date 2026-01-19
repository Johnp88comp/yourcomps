import crypto from "crypto";

/* ===============================
   CONFIG
=============================== */
const MAX_ATTEMPTS = 3;
const SECRET = process.env.ATTEMPT_SIGNING_SECRET;

/* ===============================
   QUESTION BANK (SERVER ONLY)
=============================== */
const QUESTIONS = {
  time_math: {
    answer: "12:30"
  },
  simple_addition: {
    answer: "12"
  }
};

/* ===============================
   IN-MEMORY STORE (MVP SAFE)
=============================== */
const attemptsStore = new Map();

/* ===============================
   TOKEN SIGNING (SAFE)
=============================== */
function signToken(priceId, qid) {
  if (!SECRET) return null;

  return crypto
    .createHmac("sha256", SECRET)
    .update(`${priceId}:${qid}`)
    .digest("hex");
}

/* ===============================
   API HANDLER
=============================== */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { priceId, qid, visitId, answer } = req.body || {};

    if (!priceId || !qid || !visitId || !answer) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (!SECRET) {
      console.error("❌ ATTEMPT_SIGNING_SECRET is missing");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const question = QUESTIONS[qid];
    if (!question) {
      return res.status(400).json({ error: "Invalid question" });
    }

    const key = `${priceId}:${qid}:${visitId}`;
    const record = attemptsStore.get(key) || { attempts: 0, locked: false };

    if (record.locked) {
      return res.json({ correct: false, locked: true });
    }

    /* ✅ CORRECT ANSWER */
    if (answer === question.answer) {
      attemptsStore.delete(key);

      const token = signToken(priceId, qid);
      if (!token) {
        return res.status(500).json({ error: "Token generation failed" });
      }

      return res.json({
        correct: true,
        token
      });
    }

    /* ❌ WRONG ANSWER */
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.locked = true;
      attemptsStore.set(key, record);

      return res.json({
        correct: false,
        locked: true
      });
    }

    attemptsStore.set(key, record);

    return res.json({
      correct: false,
      remaining: MAX_ATTEMPTS - record.attempts
    });

  } catch (err) {
    console.error("❌ validate-answer error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
