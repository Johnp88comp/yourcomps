/**
 * Temporary in-memory attempt store
 * (Same store used by checkout)
 */
const ATTEMPT_STORE = global.ATTEMPT_STORE || {};
global.ATTEMPT_STORE = ATTEMPT_STORE;

const MAX_ATTEMPTS = 3;

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { priceId, qid, sessionId } = req.body;

  if (!priceId || !qid || !sessionId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const key = `${sessionId}_${priceId}_${qid}`;

  ATTEMPT_STORE[key] = (ATTEMPT_STORE[key] || 0) + 1;

  res.status(200).json({
    attempts: ATTEMPT_STORE[key],
    remaining: Math.max(0, MAX_ATTEMPTS - ATTEMPT_STORE[key])
  });
}
