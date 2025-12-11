
import React, { useState } from 'react';
import { TrainingModule, QuizAnswer } from '../../utils/types';

interface QuizViewProps {
  module: TrainingModule;
  onQuizComplete: (answers: QuizAnswer[]) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ module, onQuizComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  
  const question = module.quiz[currentQuestion];

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === question.correctAnswer;
    const newAnswer: QuizAnswer = {
      questionIndex: currentQuestion,
      answer: selectedAnswer,
      isCorrect,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < module.quiz.length - 1) {
      setCurrentQuestion(q => q + 1);
    } else {
      onQuizComplete(newAnswers);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-background-secondary p-6 md:p-8 rounded-xl shadow-xl animate-fade-in-fast">
        <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Quiz: {module.title}</h1>
        </div>
        <div className="bg-background p-6 rounded-lg border border-border-color">
            <p className="text-lg font-semibold mb-4">({currentQuestion + 1}/{module.quiz.length}) {question.question}</p>
            <div className="space-y-3">
              {question.options.map(option => (
                <button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  style={{ backgroundColor: selectedAnswer === option ? 'var(--accent)' : undefined }}
                  className={`w-full text-left p-3 border-2 rounded-md transition-all duration-200 text-text-primary ${
                    selectedAnswer === option
                      ? '!bg-accent text-white border-accent shadow-lg shadow-accent/20 ring-1 ring-accent'
                      : 'bg-background hover:bg-border-color border-border-color'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
        </div>
        <div className="text-right mt-6">
            <button
              onClick={handleNext}
              disabled={selectedAnswer === null}
              className="btn btn-primary"
            >
              {currentQuestion < module.quiz.length - 1 ? 'Next' : 'Finish Quiz'}
            </button>
        </div>
    </div>
  );
};

export default QuizView;