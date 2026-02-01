import clientPromise from "../lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const collections = await db.listCollections().toArray();

    res.status(200).json({
      success: true,
      collections: collections.map(c => c.name),
    });
  } catch (error) {
    console.error("DB TEST ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
