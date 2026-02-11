import React, { useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { generateProductVideo } from "../services/videoService";
import LoadingSpinner from "../components/LoadingSpinner";

const VideoGeneratorPage: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setVideoUrl(null);
    setError(null);
    setLoadingMessage("");

    try {
      const url = await generateProductVideo(prompt, (message: any) => setLoadingMessage(message));
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setVideoUrl(null);
    setError(null);
    setIsLoading(false);
    setLoadingMessage("");
  };

  return (
    <PageShell>
      <div className="wm-page bg-background-secondary rounded-xl border border-border-color shadow-xl p-4">
        <h1 className="text-xl font-bold mb-3">Product Video Generator</h1>

        {isLoading && (
          <div className="text-center py-6">
            <LoadingSpinner />
            <h2 className="text-lg font-bold mt-4 text-accent">Generating Video…</h2>
            <p className="text-text-primary mt-2 min-h-[1.5rem]">{loadingMessage}</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-6">
            <div className="text-red-300 font-semibold mb-2">Error</div>
            <div className="text-text-primary mb-4">{error}</div>
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        )}

        {!isLoading && !error && videoUrl && (
          <div className="py-2">
            <div className="mb-3 text-text-secondary">Generated video:</div>
            <video controls className="w-full rounded-lg border border-border-color bg-black">
              <source src={videoUrl} />
            </video>

            <div className="mt-4 text-right">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Generate Another
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && !videoUrl && (
          <form onSubmit={handleGenerateVideo} className="p-4 bg-input-bg/20 border border-border-color rounded-xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A 3D animation showing a WyreStorm EX-40-H2-ARC extender set..."
              className="w-full h-40 p-3 border border-border-color rounded-md bg-input-bg focus:outline-none focus:border-accent resize-y"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Clear
              </button>
              <button type="submit" className="btn btn-primary" disabled={!prompt.trim()}>
                Generate Video
              </button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
};

export default VideoGeneratorPage;