import clientPromise from "../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("yourcomps");
    const competitions = db.collection("competitions");

    // =====================
    // GET – list competitions
    // =====================
    if (req.method === "GET") {
      const allCompetitions = await competitions
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        ok: true,
        competitions: allCompetitions,
      });
    }

    // =====================
    // POST – create competition
    // =====================
    if (req.method === "POST") {
      let body;

      try {
        body = typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body;
      } catch {
        return res.status(400).json({
          ok: false,
          error: "Invalid JSON body",
        });
      }

      const {
        title,
        description,
        entryType = "skill",
        question,
        ticketPrice,
        maxEntries,
        drawDate,
      } = body;

      if (!title || !description || !entryType) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields",
        });
      }

      // Skill question validation (important legally)
      if (entryType === "skill") {
        if (
          !question ||
          !question.text ||
          !Array.isArray(question.options) ||
          question.options.length < 2 ||
          !question.correctAnswer
        ) {
          return res.status(400).json({
            ok: false,
            error: "Invalid or missing skill question",
          });
        }
      }

      const result = await competitions.insertOne({
        title,
        description,
        entryType, // skill | postal | free
        question: entryType === "skill" ? question : null,
        ticketPrice: ticketPrice ?? 0,
        maxEntries: maxEntries ?? null,
        entriesCount: 0,
        status: "draft", // draft | live | closed | drawn
        drawDate: drawDate ? new Date(drawDate) : null,
        createdAt: new Date(),
      });

      return res.status(201).json({
        ok: true,
        id: result.insertedId,
      });
    }

    // =====================
    // Method not allowed
    // =====================
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("❌ /api/competitions error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}
