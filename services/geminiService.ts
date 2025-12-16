import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDepthMap = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  
  // Clean the base64 string if it contains metadata
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Optimized for general image tasks
      contents: {
        parts: [
          {
            text: "Create a pure grayscale depth map of this exact scene, no text, no outlines, no shading except depth, white is closest to the camera and black is farthest. Pure white must represent objects closest to the camera, and pure black must represent objects furthest away.discard the source image color elements. reason in space / volume only. The output image MUST maintain the exact same aspect ratio and composition as the input. Do not crop or distort the perspective. Return only the image."
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        // We don't set system instructions for image generation models typically, 
        // relying on the prompt.
      }
    });

    // Extract the generated image
    // The response might contain text or image. We look for inlineData.
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No response from Gemini.");
    }

    const parts = candidates[0].content.parts;
    let generatedImageBase64 = '';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        generatedImageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!generatedImageBase64) {
       // Fallback check if it returned a text description of failure
       const textPart = parts.find(p => p.text);
       if (textPart) {
         throw new Error(`Gemini returned text instead of image: ${textPart.text}`);
       }
       throw new Error("Gemini did not return a valid image.");
    }

    return `data:image/jpeg;base64,${generatedImageBase64}`;

  } catch (error) {
    console.error("Depth map generation failed:", error);
    throw error;
  }
};