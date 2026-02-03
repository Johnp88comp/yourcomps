import { getDb } from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const users = db.collection("users");

    if (req.method === "POST") {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const existing = await users.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: "User already exists" });
      }

      const result = await users.insertOne({
        email,
        name: name || null,
        createdAt: new Date(),
      });

      return res.status(201).json({
        ok: true,
        userId: result.insertedId,
      });
    }

    if (req.method === "GET") {
      const allUsers = await users.find({}).toArray();
      return res.status(200).json(allUsers);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("Users API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
