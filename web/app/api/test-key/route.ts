import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();

  if (!apiKey) {
    return Response.json({ error: "No key provided" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say: OK",
    });

    if (response.text) {
      return Response.json({ valid: true });
    }
    return Response.json({ error: "Empty response" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message || "Invalid key" },
      { status: 400 }
    );
  }
}
