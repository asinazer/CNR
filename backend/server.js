import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const PORT = 5000;

async function generateFromAI(rawText, tone) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior newsroom editor (BBC, Reuters, Al Jazeera level). Output MUST be factual, concise, and structured JSON.",
        },
        {
          role: "user",
          content: `Convert input into Urdu, English, Arabic.

Rules:
- Headline max 12 words
- Description exactly 4 lines
- Max 200 characters
- No opinion, no exaggeration
- Tone: ${tone}

Return JSON format:
{
  "urdu": {"headline":"","description":""},
  "english": {"headline":"","description":""},
  "arabic": {"headline":"","description":""}
}

Input:
${rawText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
}

function validateOutput(output) {
  const languages = ["urdu", "english", "arabic"];

  languages.forEach((lang) => {
    if (!output[lang]) throw new Error(`Missing language block: ${lang}`);

    const headline = output[lang].headline.split(/\s+/).filter(Boolean);
    if (headline.length > 12) throw new Error(`${lang} headline too long`);

    const desc = output[lang].description;
    if (typeof desc !== "string") throw new Error(`${lang} description missing`);
    if (desc.length > 200) throw new Error(`${lang} description too long`);

    const lines = desc.split("\n");
    if (lines.length !== 4) throw new Error(`${lang} description must be 4 lines`);
  });
}

app.post("/generate-news", async (req, res) => {
  try {
    const { raw_text: rawText, tone } = req.body;
    if (!rawText || !tone) {
      return res.status(400).json({ error: "raw_text and tone are required" });
    }

    const aiRaw = await generateFromAI(rawText, tone);
    if (!aiRaw) throw new Error("AI returned empty content");

    const parsed = JSON.parse(aiRaw);
    validateOutput(parsed);

    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const content = fs.readFileSync(req.file.path, "utf-8");
    fs.unlinkSync(req.file.path);
    return res.json({ text: content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on ${PORT}`);
});
