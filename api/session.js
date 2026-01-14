import crypto from "crypto";

const COOKIE_NAME = "yc_sess";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function b64urlEncode(str) {
  return Buffer.from(str).toString("base64url");
}
function b64urlDecode(str) {
  return Buffer.from(str, "base64url").toString("utf8");
}
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
    return JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }
}
function writeSession(res, session) {
  const secret = process.env.ATTEMPT_SIGNING_SECRET;
  const payloadB64 = b64urlEncode(JSON.stringify(session));
  const sig = sign(payloadB64, secret);

  const cookie = [
    `${COOKIE_NAME}=${payloadB64}.${sig}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ].join("; ");

  res.setHeader("Set-Cookie", cookie);
}

function newSession() {
  return {
    uid: crypto.randomBytes(16).toString("hex"),
    attempts: {} // key -> { visitId, attempts, passed }
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ATTEMPT_SIGNING_SECRET) {
    return res.status(500).json({ error: "Missing ATTEMPT_SIGNING_SECRET env var" });
  }

  let session = readSession(req);
  if (!session) {
    session = newSession();
    writeSession(res, session);
  }

  return res.status(200).json({ ok: true });
}
