
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function optimizePrompt(userPrompt: string): Promise<string> {
    try {
        const systemInstruction = `You are a creative prompt optimizer for an AI image generator. Your task is to take a user's prompt and rewrite it to be more descriptive, vivid, and evocative. Do NOT change the core subject or meaning. Add details about lighting, style, and composition. Respond ONLY with the new, optimized prompt.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            // FIX: Simplified `contents` for a single text prompt.
            contents: userPrompt,
            config: {
                systemInstruction,
            },
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error optimizing prompt:", error);
        // Fallback to original prompt on error
        return userPrompt;
    }
}

export async function generateImage(config: {
    prompt: string;
    aspectRatio: string;
    numberOfImages: number;
}): Promise<string[]> {
    try {
        const { prompt, aspectRatio, numberOfImages } = config;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages,
                aspectRatio,
                outputMimeType: 'image/png',
            }
        });

        return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
    } catch (error) {
        console.error("Error generating image with Imagen:", error);
        return [];
    }
}


export async function generateMultimodalImage(config: {
    prompt: string;
    subjectRefs: string[];
    styleRefs: string[];
}): Promise<string | null> {
    try {
        const { prompt, subjectRefs, styleRefs } = config;
        
        const parts: any[] = [{ text: prompt }];

        subjectRefs.forEach(base64Data => {
            parts.push({
                inlineData: { mimeType: "image/png", data: base64Data }
            });
        });

        if (styleRefs.length > 0) {
            parts.push({ text: "Use the following image(s) as a style reference:" });
            styleRefs.forEach(base64Data => {
                parts.push({
                    inlineData: { mimeType: "image/png", data: base64Data }
                });
            });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        return null;

    } catch (error) {
        console.error("Error generating multimodal image:", error);
        return null;
    }
}