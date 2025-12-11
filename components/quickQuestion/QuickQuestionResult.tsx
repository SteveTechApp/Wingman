import React from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from '../LoadingSpinner';
import { ArrowUturnLeftIcon } from '../Icons';

interface QuickQuestionResultProps {
    query: string;
    result: string | null;
    isLoading: boolean;
    error: string | null;
    onReset: () => void;
}

const QuickQuestionResult: React.FC<QuickQuestionResultProps> = ({ query, result, isLoading, error, onReset }) => {
    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-xl border border-border-color">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg truncate">Q: {query}</h3>
                <button onClick={onReset} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                    Ask Another Question
                </button>
            </div>

            <div className="pt-4 border-t border-border-color">
                {isLoading && (
                    <div className="text-center p-8">
                        <LoadingSpinner />
                        <p className="mt-2 text-text-secondary">Thinking...</p>
                    </div>
                )}
                {error && <p className="text-destructive text-center p-4">{error}</p>}
                {result && (
                     <div className="prose max-w-none p-4 bg-background rounded-md border border-border-color">
                        <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickQuestionResult;