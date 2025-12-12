import React, { useState } from 'react';
import { TRAINING_MODULES } from '../data/trainingContent';
import { TrainingModule as TrainingModuleType, QuizAnswer } from '../utils/types';
import { useUserContext } from '../context/UserContext';
import TrainingModuleView from '../components/training/TrainingModuleView';
import QuizView from '../components/training/QuizView';
import Certificate from '../components/training/Certificate';
import QuizResultsView from '../components/training/QuizResultsView';
import { useLocalStorage } from '../hooks/useLocalStorage';
import toast from 'react-hot-toast';

type TrainingStatus = 'idle' | 'in_module' | 'in_quiz' | 'quiz_results' | 'completed_all';

const TrainingPage: React.FC = () => {
    const { userProfile } = useUserContext();
    const [status, setStatus] = useState<TrainingStatus>('idle');
    const [activeModule, setActiveModule] = useState<TrainingModuleType | null>(null);
    const [lastQuizScore, setLastQuizScore] = useState<number | null>(null);
    const [completedModules, setCompletedModules] = useLocalStorage<string[]>('completedTrainingModules', []);

    const startModule = (module: TrainingModuleType) => {
        setActiveModule(module);
        setStatus('in_module');
    };
    
    const startQuiz = (module: TrainingModuleType) => {
        setActiveModule(module);
        setStatus('in_quiz');
    };

    const handleQuizComplete = (answers: QuizAnswer[]) => {
        if (!activeModule) return;
        const score = (answers.filter(a => a.isCorrect).length / activeModule.quiz.length) * 100;
        
        setLastQuizScore(score);
        
        if (score >= 75) {
            toast.success(`Module passed with ${score.toFixed(0)}%!`);
            const newCompleted = Array.from(new Set([...completedModules, activeModule.id]));
            setCompletedModules(newCompleted);
            
            if (newCompleted.length === TRAINING_MODULES.length) {
                setStatus('completed_all');
            } else {
                setStatus('idle');
            }
            setActiveModule(null);
        } else {
            toast.error(`Score of ${score.toFixed(0)}% is not enough to pass. Please try again.`);
            setStatus('quiz_results');
        }
    };

    // Content Wrapper logic
    const renderContent = () => {
        if (status === 'completed_all') {
            return <Certificate userProfile={userProfile} />;
        }
        if (activeModule && status === 'in_module') {
            return <TrainingModuleView module={activeModule} onComplete={() => startQuiz(activeModule)} />;
        }
        if (activeModule && status === 'in_quiz') {
            return <QuizView module={activeModule} onQuizComplete={handleQuizComplete} />;
        }
        if (activeModule && status === 'quiz_results') {
            return <QuizResultsView
                module={activeModule}
                score={lastQuizScore!}
                onRetake={() => startQuiz(activeModule)}
                onReview={() => startModule(activeModule)}
                onExit={() => { setStatus('idle'); setActiveModule(null); }}
            />
        }
        return (
            <div className="max-w-5xl mx-auto bg-background-secondary p-6 md:p-8 rounded-xl shadow-xl animate-fade-in-fast">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">Training Academy</h1>
                    <p className="text-lg text-text-secondary">Complete all modules to receive your certificate. A score of 75% is required on each quiz.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TRAINING_MODULES.map(module => (
                        <div key={module.id} className="p-6 bg-background rounded-xl border border-border-color flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300 hover:border-accent-border-subtle">
                            <div>
                                <h2 className="text-lg font-bold mb-2 line-clamp-2">{module.title}</h2>
                                <p className="text-sm text-text-secondary line-clamp-3 mb-4">
                                    {module.contentPages[0].content.replace(/(\*\*|__)/g, '').substring(0, 100)}...
                                </p>
                            </div>
                            <div className="mt-auto">
                                {completedModules.includes(module.id) ? (
                                    <span className="font-bold text-green-600 flex items-center bg-green-50 px-3 py-2 rounded-md w-fit">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Completed
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => startModule(module)}
                                        className="bg-accent-bg-subtle hover:bg-accent-bg-very-subtle text-accent font-bold py-2 px-4 rounded-md transition-colors w-full"
                                    >
                                        Start Module
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6">
            <div className="pb-20">
                {renderContent()}
            </div>
        </div>
    );
};

export default TrainingPage;