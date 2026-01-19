import crypto from "crypto";

if (!SECRET) {
  throw new Error("ATTEMPT_SIGNING_SECRET is not set");
}

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
   IN-MEMORY STORE (OK for MVP)
   (Vercel keeps this per instance)
=============================== */
const attemptsStore = new Map();

/* ===============================
   TOKEN SIGNING
=============================== */
function signToken(priceId, qid) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${priceId}:${qid}`)
    .digest("hex");
}

/* ===============================
   API HANDLER
=============================== */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { priceId, qid, visitId, answer } = req.body || {};

  if (!priceId || !qid || !visitId || !answer) {
    return res.status(400).json({ error: "Missing data" });
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

  if (answer === question.answer) {
    attemptsStore.delete(key);

    return res.json({
      correct: true,
      token: signToken(priceId, qid)
    });
  }

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
}
