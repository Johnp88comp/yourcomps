import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("yourcomps");
    const users = db.collection("users");

    // GET /api/users
    if (req.method === "GET") {
      const allUsers = await users.find({}).toArray();
      return res.status(200).json({ ok: true, users: allUsers });
    }

    // POST /api/users
    if (req.method === "POST") {
      let body;

      try {
        body =
          typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body;
      } catch {
        return res.status(400).json({
          ok: false,
          error: "Invalid JSON body",
        });
      }

      const { email, name } = body;

      if (!email || !name) {
        return res.status(400).json({
          ok: false,
          error: "Email and name are required",
        });
      }

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

  } catch (err) {
    console.error("API /users error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}
