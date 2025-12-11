import React, { useState } from 'react';
import { generateProductVideo } from '../services/videoService';
import LoadingSpinner from '../components/LoadingSpinner';

const VideoGeneratorPage: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsLoading(true);
        setVideoUrl(null);
        setError(null);
        setLoadingMessage('');

        try {
            const url = await generateProductVideo(prompt, (message) => {
                setLoadingMessage(message);
            });
            setVideoUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setPrompt('');
        setVideoUrl(null);
        setError(null);
        setIsLoading(false);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8 bg-background-secondary rounded-xl border border-border-color shadow-xl">
                    <LoadingSpinner />
                    <h2 className="text-2xl font-bold mt-4 uppercase tracking-widest text-accent">Generating Video...</h2>
                    <p className="text-text-primary mt-2 h-6">{loadingMessage}</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-8 bg-destructive-bg border border-destructive-border-subtle rounded-xl">
                    <h2 className="text-2xl font-bold text-destructive">Generation Failed</h2>
                    <p className="mt-2 text-text-secondary">{error}</p>
                    <button onClick={handleReset} className="mt-4 btn btn-secondary">
                        Try Again
                    </button>
                </div>
            );
        }

        if (videoUrl) {
            return (
                <div className="p-6 bg-background-secondary border border-border-color rounded-xl shadow-xl">
                    <h2 className="text-xl font-bold mb-4 uppercase tracking-widest">// Generated Video</h2>
                    <video src={videoUrl} controls className="w-full rounded-md" />
                    <div className="mt-4 text-right">
                        <button onClick={handleReset} className="btn btn-primary">
                            Generate Another Video
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <form onSubmit={handleGenerateVideo} className="p-6 bg-background-secondary border border-border-color rounded-xl shadow-xl">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A 3D animation showing a WyreStorm EX-40-H2-ARC extender set. A laptop connects to the transmitter with an HDMI cable. A Cat6 cable connects the transmitter to the receiver, which is behind a TV. The TV displays a 4K image."
                    className="w-full h-40 p-4 border border-border-color rounded-md bg-input-bg focus:outline-none focus:border-accent resize-y"
                />
                <div className="mt-4 text-right">
                    <button type="submit" className="btn btn-primary text-lg" disabled={!prompt.trim()}>
                        Generate Video
                    </button>
                </div>
            </form>
        );
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-fast">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">AI Video Generator</h1>
                <p className="text-lg text-text-secondary">Create short product animations or training videos from a text description.</p>
            </div>
            {renderContent()}
        </div>
    );
};

export default VideoGeneratorPage;