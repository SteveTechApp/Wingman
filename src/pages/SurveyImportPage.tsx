import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerationContext } from '../context/GenerationContext';
import toast from 'react-hot-toast';
import { DocumentScannerIcon, ArrowUturnLeftIcon } from '../components/Icons';

const blobToBase64 = (blob: Blob): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const mimeType = base64data.substring(base64data.indexOf(':') + 1, base64data.indexOf(';'));
      const data = base64data.split(',')[1];
      resolve({ mimeType, data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const SurveyImportPage: React.FC = () => {
    const navigate = useNavigate();
    const { handleSurveyImport } = useGenerationContext();
    const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
    const [image, setImage] = useState<{ blob: Blob, url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setMode('camera');
        } catch (err) {
            toast.error("Could not access camera. Please check permissions.");
            console.error("Camera access error:", err);
            setError("Camera access was denied. Please enable it in your browser settings.");
            // Clean up stream on error
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleCapture = () => {
        try {
            const video = videoRef.current;
            if (!video) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(blob => {
                if (blob) {
                    setImage({ blob, url: URL.createObjectURL(blob) });
                    setMode('preview');
                    // Stop camera after successful capture
                    stopCamera();
                }
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error('Capture error:', error);
            toast.error('Failed to capture image. Please try again.');
            stopCamera();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage({ blob: file, url: URL.createObjectURL(file) });
            setMode('preview');
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        const { mimeType, data } = await blobToBase64(image.blob);
        handleSurveyImport(data, mimeType, navigate);
    };
    
    useEffect(() => {
        // Cleanup camera stream on component unmount or mode change
        return () => {
            stopCamera();
            // Also cleanup any blob URLs
            if (image) {
                URL.revokeObjectURL(image.url);
            }
        };
    }, []);

    const reset = () => {
        stopCamera();
        if (image) URL.revokeObjectURL(image.url);
        setImage(null);
        setError(null);
        setMode('select');
    };

    const renderContent = () => {
        switch (mode) {
            case 'camera':
                return (
                    <div className="w-full flex flex-col items-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] rounded-md border border-border-color bg-black"></video>
                        <div className="flex gap-4 mt-4">
                            <button onClick={reset} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleCapture} className="btn btn-primary">Capture</button>
                        </div>
                    </div>
                );
            case 'preview':
                return (
                    <div className="w-full flex flex-col items-center">
                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg p-8 flex items-center justify-center">
                  <div className="w-16 h-16 text-white/30">●</div>
                </div>
                        <div className="flex gap-4 mt-4">
                            <button onClick={reset} className="btn btn-secondary">Retake</button>
                            <button onClick={handleAnalyze} className="btn btn-accent">Confirm & Analyze</button>
                        </div>
                    </div>
                );
            case 'select':
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onClick={startCamera} className="p-8 border-2 border-dashed border-border-color rounded-lg hover:border-accent hover:bg-accent-bg-subtle text-center">
                            <h3 className="text-xl font-bold">Scan with Camera</h3>
                            <p className="text-sm text-text-secondary mt-1">Use your device's camera to scan the survey form live.</p>
                        </button>
                        <label className="p-8 border-2 border-dashed border-border-color rounded-lg hover:border-accent hover:bg-accent-bg-subtle text-center cursor-pointer">
                             <h3 className="text-xl font-bold">Upload Document</h3>
                            <p className="text-sm text-text-secondary mt-1">Upload a photo or PDF of the completed survey form.</p>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-fast">
            <div className="text-center mb-8">
                <div className="flex justify-center items-center gap-2 mb-2">
                    <DocumentScannerIcon className="h-10 w-10 text-accent" />
                    <h1 className="text-4xl font-extrabold text-accent uppercase tracking-widest">Import Site Survey</h1>
                </div>
                <p className="text-lg text-text-secondary">Let the AI read a completed survey form to create a new project room.</p>
                 {mode !== 'select' && (
                    <button onClick={reset} className="mt-4 text-sm font-semibold text-accent hover:underline flex items-center gap-1 mx-auto">
                        <ArrowUturnLeftIcon className="h-4 w-4" /> Start Over
                    </button>
                )}
            </div>
            <div className="p-6 bg-background-secondary border border-border-color rounded-xl shadow-xl">
                {error ? <p className="text-destructive text-center">{error}</p> : renderContent()}
            </div>
        </div>
    );
};

export default SurveyImportPage;