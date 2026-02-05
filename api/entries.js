import clientPromise from "../lib/mongodb.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { competitionId, userId, answer } = body;

    if (!competitionId || !userId) {
      return res.status(400).json({
        ok: false,
        error: "competitionId and userId are required",
      });
    }

    const client = await clientPromise;
    const db = client.db("yourcomps");

    const competitions = db.collection("competitions");
    const entries = db.collection("entries");

    const competition = await competitions.findOne({
      _id: new ObjectId(competitionId),
    });
    // Competition must exist
if (!competition) {
  return res.status(404).json({
    ok: false,
    error: "Competition not found"
  });
}

// Competition must be live
if (competition.status !== "live") {
  return res.status(403).json({
    ok: false,
    error: "Competition is not live"
  });
}

// Competition must not be past draw date
if (new Date(competition.drawDate) <= new Date()) {
  return res.status(403).json({
    ok: false,
    error: "Competition has closed"
  });
}

    if (!competition) {
      return res.status(404).json({
        ok: false,
        error: "Competition not found",
      });
    }

    if (competition.entriesCount >= competition.maxEntries) {
      return res.status(409).json({
        ok: false,
        error: "Competition is full",
      });
    }

    // Skill question validation
    if (competition.entryType === "skill") {
      if (!answer) {
        return res.status(400).json({
          ok: false,
          error: "Answer required for skill entry",
        });
      }

      if (answer !== competition.question.correctAnswer) {
        return res.status(403).json({
          ok: false,
          error: "Incorrect answer",
        });
      }
    }
if (competition.maxEntriesPerUser) {
  const userEntryCount = await entries.countDocuments({
    competitionId,
    userId
  });

  if (userEntryCount >= competition.maxEntriesPerUser) {
    return res.status(403).json({
      ok: false,
      error: "User entry limit reached"
    });
  }
}

    // Create entry
    const entryResult = await entries.insertOne({
      competitionId: competition._id,
      userId: new ObjectId(userId),
      createdAt: new Date(),
    });

    // Increment entries count
    await competitions.updateOne(
      { _id: competition._id },
      { $inc: { entriesCount: 1 } }
    );

    return res.status(201).json({
      ok: true,
      entryId: entryResult.insertedId,
    });
  } catch (err) {
    console.error("POST /api/entries error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}
