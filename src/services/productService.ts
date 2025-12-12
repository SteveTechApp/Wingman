import { GoogleGenAI } from '@google/genai';
import { Product, RelatedProductsPayload } from '../utils/types';
import { PRODUCT_FINDER_SCHEMA, RELATED_PRODUCTS_SCHEMA } from './schemas';
import { safeParseJson } from '../utils/utils';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

/**
 * Finds relevant products based on a user query.
 */
export const findProducts = async (query: string, productDatabase: Product[]): Promise<string[]> => {
  const prompt = `
You are an AI product finder for WyreStorm. Your task is to find relevant product SKUs from the database based on a user's query.

User Query: "${query}"

Product Database:
${JSON.stringify(productDatabase.map(p => ({ sku: p.sku, name: p.name, category: p.category, description: p.description, tags: p.tags })), null, 2)}

Analyze the user's query and return a list of the most relevant product SKUs.
- Match keywords from the query to the product name, description, category, and tags.
- Prioritize products that are a close match.
- Return up to 10 relevant SKUs.

Return only valid JSON. Do not include markdown formatting or explanations.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PRODUCT_FINDER_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("Empty AI response.");
    }
    const result = safeParseJson(text);
    return result.skus || [];
  } catch (error) {
    console.error("Error finding products:", error);
    throw new Error("Failed to find products due to an API or parsing error.");
  }
};

/**
 * Finds related products (alternatives and accessories) for a given product.
 */
export const findRelatedProducts = async (product: Product, productDatabase: Product[]): Promise<RelatedProductsPayload> => {
  const prompt = `
You are an AI product specialist for WyreStorm. Your task is to suggest alternatives and required accessories for a given product.

Source Product:
${JSON.stringify(product, null, 2)}

Full Product Database:
${JSON.stringify(productDatabase.map(p => ({ sku: p.sku, name: p.name, category: p.category, description: p.description, tags: p.tags })), null, 2)}

Tasks:
1. Find 1-2 alternatives (upsell, downsell, or similar product) with sku, name, and a short reason.
2. Find 1-2 accessories required for the source product with sku, name, and a reason.

Return only valid JSON. Do not include markdown formatting or explanations.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RELATED_PRODUCTS_SCHEMA,
      },
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("Empty AI response.");
    }
    return safeParseJson(text);
  } catch (error) {
    console.error("Error finding related products:", error);
    throw new Error("Failed to find related products due to an API or parsing error.");
  }
};