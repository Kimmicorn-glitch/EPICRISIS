import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import dotenv from "dotenv";
import { BedrockClient, InvokeModelCommand } from "@aws-sdk/client-bedrock";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 3000;

const bedrock = new BedrockClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

// Extract text from PDF
async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  return data.text;
}

// Call LLaMA Maveric
async function explainText(text) {
  const command = new InvokeModelCommand({
    modelId: "llama-maveric",
    body: `Explain this medical record to a layman:\n${text}`,
    contentType: "text/plain"
  });

  const response = await bedrock.send(command);
  return response.body.toString();
}

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const text = await extractText(filePath);
    const explanation = await explainText(text);
    fs.unlinkSync(filePath); // cleanup
    res.json({ explanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Bedrock LLaMA API running on http://localhost:${port}`);
});
