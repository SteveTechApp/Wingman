
import React from 'react';

interface PresetQuestionsProps {
    handleSend: (question: string) => void;
    isLoading: boolean;
}

const PRESET_QUESTIONS = [
    "What's the difference between HDBaseT Class A and B?",
    "When should I use the NetworkHD 500 series?",
    "I need a 4x2 matrix with USB-C, what do you recommend?",
    "Explain chroma subsampling 4:4:4 vs 4:2:0.",
];

const PresetQuestions: React.FC<PresetQuestionsProps> = ({ handleSend, isLoading }) => (
    <div className="mt-4">
        <div className="flex flex-wrap justify-center gap-2">
            {PRESET_QUESTIONS.map((q, i) => (
                <button
                    key={i}
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="text-xs text-left p-2 bg-background hover:bg-input-bg rounded-md border border-border-color transition-colors disabled:opacity-50"
                >
                    {q}
                </button>
            ))}
        </div>
    </div>
);

export default PresetQuestions;
