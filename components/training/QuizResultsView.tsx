import React from 'react';
import { TrainingModule } from '../../utils/types';

interface QuizResultsViewProps {
  module: TrainingModule;
  score: number;
  onRetake: () => void;
  onReview: () => void;
  onExit: () => void;
}

const QuizResultsView: React.FC<QuizResultsViewProps> = ({ module, score, onRetake, onReview, onExit }) => {
  const isPass = score >= 75;

  return (
    <div className="max-w-4xl mx-auto bg-background-secondary p-6 md:p-8 rounded-xl shadow-xl animate-fade-in-fast text-center">
        <h1 className="text-2xl font-bold mb-2">Quiz Results: {module.title}</h1>
        <div className={`p-8 rounded-lg ${isPass ? 'bg-green-100' : 'bg-destructive-bg'}`}>
            <p className="text-lg">Your Score:</p>
            <p className={`text-6xl font-black ${isPass ? 'text-green-600' : 'text-destructive'}`}>{score.toFixed(0)}%</p>
            <p className={`mt-2 font-semibold ${isPass ? 'text-green-700' : 'text-red-700'}`}>
                {isPass ? 'Congratulations, you passed!' : 'You need a score of 75% or higher to pass.'}
            </p>
        </div>
        <div className="mt-8 flex justify-center gap-4">
            {!isPass && (
                 <>
                    <button onClick={onRetake} className="btn btn-primary">Retake Quiz</button>
                    <button onClick={onReview} className="btn btn-secondary">Review Module</button>
                 </>
            )}
            <button onClick={onExit} className="btn btn-secondary">Back to Academy</button>
        </div>
    </div>
  );
};

export default QuizResultsView;