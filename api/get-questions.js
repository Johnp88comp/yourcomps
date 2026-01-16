// api/get-question.js
import crypto from "crypto";

const QUESTIONS = {
  time_math: {
    question: "If a train leaves at 12:00 and takes 30 minutes, when does it arrive?",
    answer: "12:30",
    options: ["12:15", "12:30", "12:45", "13:00"]
  },
  simple_addition: {
    question: "What is 7 + 5?",
    answer: "12",
    options: ["10", "11", "12", "13"]
  }
};

export default function handler(req, res) {
  const { qid } = req.query;

  if (!qid || !QUESTIONS[qid]) {
    return res.status(400).json({ error: "Invalid question" });
  }

  const { question, options } = QUESTIONS[qid];

  res.status(200).json({ question, options });
}
