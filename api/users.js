import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("yourcomps");
    const users = db.collection("users");

    if (req.method === "GET") {
      const allUsers = await users.find({}).toArray();
      return res.status(200).json({ ok: true, users: allUsers });
    }

    if (req.method === "POST") {
  let body;

  try {
    body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: "Invalid JSON body"
    });
  }

  const { email, name } = body;

  if (!email || !name) {
    return res.status(400).json({
      ok: false,
      error: "Email and name are required"
    });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "User already exists"
      });
    }

    const result = await db.collection("users").insertOne({
      email,
      name,
      createdAt: new Date()
    });

    return res.status(201).json({
      ok: true,
      id: result.insertedId
    });
  } catch (err) {
    console.error("POST /api/users error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
}

