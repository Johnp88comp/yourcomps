import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      return res.status(500).json({ error: "MONGODB_URI missing" });
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db("yourcomps");
    const collections = await db.listCollections().toArray();

    await client.close();

    return res.status(200).json({
      ok: true,
      collections: collections.map(c => c.name),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
