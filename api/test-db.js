import { getDb } from "../frontend/lib/mongodb";

export default async function handler(req, res) {
  try {
    const db = await getDb();

    // simple command to prove connection
    const collections = await db.listCollections().toArray();

    res.status(200).json({
      success: true,
      message: "MongoDB connected successfully 🚀",
      collections: collections.map(c => c.name),
    });
  } catch (error) {
    console.error("DB connection error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
