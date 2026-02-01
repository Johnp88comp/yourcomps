import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("yourcomps");

    const collections = await db.listCollections().toArray();

    res.status(200).json({
      success: true,
      collections: collections.map(c => c.name),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
