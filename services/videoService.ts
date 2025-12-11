import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error('VITE_API_KEY environment variable is not configured. Please set it in your .env file.');
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const POLLING_INTERVAL = 10000; // 10 seconds
const MAX_POLLING_ATTEMPTS = 120; // 20 minutes with 10s intervals

export const generateProductVideo = async (
  prompt: string,
  onProgress: (message: string) => void
): Promise<string> => {
  try {
    onProgress('Sending request to the video generation model...');
    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
      },
    });

    onProgress('The AI is storyboarding your video...');
    let progressCount = 0;
    let attempts = 0;
    const progressMessages = [
        "Rendering initial frames...",
        "This can take a few minutes, please be patient...",
        "Compositing video layers...",
        "Applying finishing touches...",
        "Almost ready..."
    ];

    while (!operation.done && attempts < MAX_POLLING_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      onProgress(progressMessages[progressCount % progressMessages.length]);
      progressCount++;
      attempts++;
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (!operation.done) {
      throw new Error('Video generation timed out after 20 minutes. Please try again with a simpler prompt.');
    }
    
    onProgress('Finalizing video...');

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Video generation completed, but no download link was provided.');
    }

    onProgress('Downloading generated video...');
    const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video file. Status: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    // Note: Caller is responsible for revoking this URL with URL.revokeObjectURL() when done
    return videoUrl;
  } catch (error) {
    console.error('Error generating video:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate video: ${error.message}`);
    }
    throw new Error('An unknown error occurred during video generation.');
  }
};