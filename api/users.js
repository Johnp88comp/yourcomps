import { getDb } from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const users = db.collection("users");

    if (req.method === "GET") {
      const allUsers = await users.find({}).toArray();
      return res.status(200).json({ ok: true, users: allUsers });
    }

    if (req.method === "POST") {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ ok: false, error: "Email required" });
      }

      const result = await users.insertOne({
        email,
        name: name || null,
        createdAt: new Date()
      });

      return res.status(201).json({ ok: true, id: result.insertedId });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
