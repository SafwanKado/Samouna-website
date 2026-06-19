import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateBakeryImage = async (name: string, description: string): Promise<string | null> => {
  try {
    const prompt = `A high-quality, professional photograph of a bakery named "${name}". Description: ${description}. The image should be appetizing, well-lit, and suitable for a food delivery app header. No text in the image.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating bakery image:", error);
    return null;
  }
};

export const generateProductImage = async (name: string, category: string): Promise<string | null> => {
  try {
    const prompt = `A high-quality, close-up professional food photograph of ${name} (${category}). The image should be appetizing, well-lit, and suitable for a food delivery app product listing. No text in the image. Plain background.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating product image:", error);
    return null;
  }
};

export const getRelevantPlaceholder = (name: string): string => {
  const keywords = ['bakery', 'bread', 'pastry', 'cake', 'oven'];
  const safeName = name || 'bakery';
  const seed = safeName.toLowerCase().split(' ').join('-');
  // Use Unsplash Source for more relevant images
  return `https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200&h=600&q=80&sig=${seed}`;
};
