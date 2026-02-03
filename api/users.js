import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("yourcomps");
  const users = db.collection("users");

  // GET all users
  if (req.method === "GET") {
    const allUsers = await users.find({}).toArray();
    return res.status(200).json({ ok: true, users: allUsers });
  }

  // CREATE user
  if (req.method === "POST") {
    const { email, name, role = "user" } = req.body || {};

    // Basic validation
    if (!email || !name) {
      return res.status(400).json({
        ok: false,
        error: "Email and name are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid email format",
      });
    }

    // Prevent duplicates
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "User already exists",
      });
    }

    const result = await users.insertOne({
      email,
      name,
      role,
      createdAt: new Date(),
    });

    return res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  }

  // Method not allowed
  return res.status(405).json({
    ok: false,
    error: "Method not allowed",
  });
}
