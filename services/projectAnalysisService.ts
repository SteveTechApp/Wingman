import { GoogleGenAI } from '@google/genai';
import {
  ProjectData,
  RoomData,
  UserProfile,
  DesignFeedbackItem,
  ProjectSetupData,
} from '../utils/types';
import {
  REQUIREMENTS_ANALYSIS_SCHEMA,
  PROJECT_INSIGHTS_SCHEMA,
  ROOM_REVIEW_SCHEMA,
} from './schemas';
import { getLocalizationInstructions } from './localizationService';
import { safeParseJson } from '../utils/utils';
import { MODULE_12_SITE_SURVEY } from '../data/training/module12_site_survey';

// ✅ Vite-compatible environment variable loading
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error('VITE_API_KEY is missing. Add it to your .env file.');
}

// ✅ Safe, correct instantiation of the Google GenAI client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// ✅ Central model config – change here if you want a different Gemini model
const DEFAULT_MODEL_ID = 'gemini-1.5-flash'; // or 'gemini-1.5-pro', etc.

/**
 * Shared helper to call the JSON model and parse with a schema.
 * This assumes:
 * - your @google/genai client supports responseMimeType / responseSchema
 * - safeParseJson(text, schema, contextLabel) exists and returns a typed value
 */
async function callJsonModel<T>(
  prompt: string,
  schema: unknown,
  contextLabel: string
): Promise<T> {
  const model = ai.getGenerativeModel({
    model: DEFAULT_MODEL_ID,
    generationConfig: {
      // Ask Gemini to give us structured JSON
      responseMimeType: 'application/json',
      responseSchema: schema as any,
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();

  // Use your existing safe JSON + schema validator
  const parsed = safeParseJson(rawText, schema, contextLabel) as T;
  return parsed;
}

/**
 * Build a consistent system/user prompt wrapper using:
 * - localization instructions
 * - site-survey training material
 */
function buildBasePrompt(
  userInstruction: string,
  userProfile?: UserProfile
): string {
  const localization = getLocalizationInstructions(userProfile);
  const trainingContext =
    typeof MODULE_12_SITE_SURVEY === 'string'
      ? MODULE_12_SITE_SURVEY
      : JSON.stringify(MODULE_12_SITE_SURVEY, null, 2);

  return `
You are "WyreStorm Wingman", an AV design and project-analysis assistant.

Follow these rules:
- Always answer using valid JSON that matches the provided schema.
- Use British English spelling and terminology unless localization says otherwise.
- Align recommendations with realistic AV integration practice and WyreStorm-style solutions.

Localization instructions:
${localization}

Training reference – Module 12: Site Survey and AV Project Design:
${trainingContext}

User task:
${userInstruction}
  `.trim();
}

/**
 * Analyze high-level requirements from an RFP / brief / notes.
 *
 * Expected output shape should match REQUIREMENTS_ANALYSIS_SCHEMA.
 */
export async function analyzeRequirements(
  documentText: string,
  projectSetupData: ProjectSetupData,
  userProfile?: UserProfile
): Promise<any> {
  const userInstruction = `
Analyze the following AV project requirements.

Input:
- Raw requirements / RFP text:
"""${documentText}"""

- Project setup data (JSON):
${JSON.stringify(projectSetupData, null, 2)}

Goals:
- Extract key functional requirements, constraints, risks, and assumptions.
- Identify missing information and sensible clarification questions for the client.
- Highlight opportunities to upsell Bronze / Silver / Gold solutions where appropriate.
- Keep responses concise but practically useful for an AV designer or sales engineer.

Return a JSON object that strictly follows the REQUIREMENTS_ANALYSIS_SCHEMA.
  `.trim();

  const prompt = buildBasePrompt(userInstruction, userProfile);

  const result = await callJsonModel<any>(
    prompt,
    REQUIREMENTS_ANALYSIS_SCHEMA,
    'requirementsAnalysis'
  );

  return result;
}

/**
 * Generate project-level insights, recommendations and red flags.
 *
 * Expected output shape should match PROJECT_INSIGHTS_SCHEMA.
 */
export async function generateProjectInsights(
  projectData: ProjectData,
  userProfile?: UserProfile
): Promise<any> {
  const userInstruction = `
You are reviewing an AV project design with the following data:

Project data (JSON):
${JSON.stringify(projectData, null, 2)}

Tasks:
- Summarise the project in a way that a sales director or senior PM can scan quickly.
- Identify technical risks, logistical risks, and commercial risks.
- Recommend mitigation actions and highlight any "must-fix" issues before installation.
- Suggest where WyreStorm-style Bronze / Silver / Gold options could be articulated to the client.
- Provide 3–5 clear "next steps" for the account manager or sales engineer.

Return a JSON object that strictly follows the PROJECT_INSIGHTS_SCHEMA.
  `.trim();

  const prompt = buildBasePrompt(userInstruction, userProfile);

  const result = await callJsonModel<any>(
    prompt,
    PROJECT_INSIGHTS_SCHEMA,
    'projectInsights'
  );

  return result;
}

/**
 * Review each room / space and provide structured design feedback.
 *
 * Expected output shape should match ROOM_REVIEW_SCHEMA and be easily
 * mappable to DesignFeedbackItem objects used in your UI.
 */
export async function reviewRooms(
  rooms: RoomData[],
  projectSetupData: ProjectSetupData,
  userProfile?: UserProfile
): Promise<DesignFeedbackItem[]> {
  const userInstruction = `
Review the following rooms for an AV project and provide structured feedback.

Rooms (JSON array):
${JSON.stringify(rooms, null, 2)}

Project setup data (JSON):
${JSON.stringify(projectSetupData, null, 2)}

For each room:
- Check that the proposed design makes sense for the room type and capacity.
- Flag obvious design problems (e.g. cable distance vs. technology limits, bandwidth, sight lines).
- Suggest practical improvements or alternative WyreStorm-style solutions.
- Highlight any missing information the integrator should confirm.
- Consider Bronze / Silver / Gold upsell logic where applicable.

Return a JSON object that strictly follows the ROOM_REVIEW_SCHEMA.
Each feedback entry should be easily convertible into a DesignFeedbackItem in the UI.
  `.trim();

  const prompt = buildBasePrompt(userInstruction, userProfile);

  const result = await callJsonModel<{ feedback: DesignFeedbackItem[] }>(
    prompt,
    ROOM_REVIEW_SCHEMA,
    'roomReview'
  );

  // Assuming the schema's top level looks like { feedback: DesignFeedbackItem[] }
  // If your schema is different, tweak this accordingly.
  return result.feedback ?? [];
}

/**
 * Analyze a survey document (image or text) and extract project requirements
 */
export async function analyzeSurveyDocument(
  documentText: string,
  userProfile?: UserProfile
): Promise<any> {
  const userInstruction = `
Analyze the following site survey document and extract structured project information.

Survey document content:
"""${documentText}"""

Tasks:
- Extract room names, dimensions, and purposes
- Identify mentioned equipment and AV requirements
- Note any specific client requests or constraints
- Identify gaps in information that need clarification
- Suggest appropriate WyreStorm solutions based on the requirements

Return a JSON object with the extracted information in a structured format.
  `.trim();

  const prompt = buildBasePrompt(userInstruction, userProfile);

  const model = ai.getGenerativeModel({
    model: DEFAULT_MODEL_ID,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error('Failed to parse survey analysis:', error);
    return { error: 'Failed to parse survey document', rawText };
  }
}
