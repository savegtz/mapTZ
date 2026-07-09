import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Check if Gemini is configured properly
app.get("/api/config", (req, res) => {
  res.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    appUrl: process.env.APP_URL || "http://localhost:3000"
  });
});

// Post endpoint for chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context } = req.body;
    const ai = getAI();

    const systemInstruction = `You are "Navigator AI", a helpful, friendly, and expert AR and GPS speech assistant.
You help users find their destinations in Augmented Reality.
You are conversing with the user in real-time. Keep your answers brief, human-like, and highly descriptive.
If the user speaks Swahili, respond in fluent, polite Swahili. If they speak English, respond in English.
Keep instructions incredibly concise (under 2 sentences) because they will be converted to Speech Synthesis (text-to-speech) and played back as the user walks!
Current context of navigation: ${JSON.stringify(context || {})}`;

    // Format chat messages
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || m.text || "" }]
    }));

    // Add a default prompt if empty
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: "user",
        parts: [{ text: "Hello! Introduce yourself briefly as the voice navigator." }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedMessages,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to generate conversation" });
  }
});

// Endpoint to generate voice directions/speech guidance based on distance, bearing, and custom instructions
app.post("/api/voice-guide", async (req, res) => {
  try {
    const { distance, bearing, directionText, destName, userLanguage } = req.body;
    const ai = getAI();

    const prompt = `Generate a very short, real-time spoken voice prompt (maximum 2 sentences, 25 words) for a pedestrian navigator heading to a place.
    - Destination Name: "${destName || "Target Destination"}"
    - Current Distance: ${distance.toFixed(1)} meters
    - Relative direction/bearing: ${bearing.toFixed(0)} degrees (0 is straight ahead, 90 is right, 180 is behind, 270 is left)
    - Custom physical notes by owner: "${directionText || ""}"
    - User Language preference: ${userLanguage || "en"} (Write in natural, conversational Swahili if 'sw', otherwise English. Example: 'Bado mita 15, geuka kulia kwenye mlango wa bluu' or '15 meters left, turn right at the blue door').
    Make it sound like a friendly, active co-pilot. Keep it very short so it can be spoken quickly.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 80,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/voice-guide:", error);
    res.status(500).json({ error: error.message || "Failed to generate guidance" });
  }
});

// Start server and handle static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
