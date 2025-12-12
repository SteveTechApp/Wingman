import { UserProfile } from '../utils/types';
import { SUPPORTED_LANGUAGES } from '../data/constants';

interface LanguageRule {
  code: string;
  name: string;
  example?: string; // Optional style, formality, or spelling guidance
}

/**
 * Generates a fully structured, strict AI prompt template based on the user's language.
 * Handles all English variants dynamically and supports non-English languages with style rules.
 * @param userProfile The user's profile containing the selected language.
 * @returns A structured instruction string for AI prompt injection.
 */
export const getLocalizationInstructions = (userProfile: UserProfile | null): string => {
  const defaultLang: LanguageRule = { code: 'en-GB', name: 'British English' };
  const langCode = userProfile?.language || defaultLang.code;

  const lang: LanguageRule = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || defaultLang;

  let languageSection: string;
  let styleSection: string;

  // English variant handling
  if (langCode.startsWith('en-')) {
    const region = langCode.split('-')[1]; // e.g., GB, US, AU
    languageSection = `Language: English (${region})`;
    styleSection = `Spelling and terminology: Follow standard ${region} conventions (e.g., ${region === 'GB' ? 'colour, centre, analyse' : region === 'US' ? 'color, center, analyze' : 'colour, centre, analyse'}).`;
  } else {
    // Non-English languages
    languageSection = `Language: ${lang.name} (${lang.code})`;
    styleSection = lang.example ? `Style/Guidelines: ${lang.example}` : 'Style/Guidelines: Follow standard conventions for this language.';
  }

  // Structured prompt template
  return `
INSTRUCTION:
-------------------------
${languageSection}
${styleSection}
Enforcement: Adherence to this language and style is STRICT and MANDATORY. Do not deviate.

EXAMPLES:
${langCode.startsWith('en-') ? 'Use variant-specific spelling and terminology as above.' : lang.example ?? 'Follow the standard grammar and style rules for this language.'}

NOTES:
- Responses must fully respect the selected language and style.
- Any deviation is unacceptable.
`;
};