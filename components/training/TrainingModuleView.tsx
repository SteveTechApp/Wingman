import React, { useState } from 'react';
import { TrainingModule } from '../../utils/types';
// A basic markdown parser could be used here in a real app
import ReactMarkdown from 'react-markdown';

interface TrainingModuleViewProps {
  module: TrainingModule;
  onComplete: () => void;
}

const TrainingModuleView: React.FC<TrainingModuleViewProps> = ({ module, onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const page = module.contentPages[currentPage];

  return (
    <div className="max-w-4xl mx-auto bg-background-secondary p-6 md:p-8 rounded-xl shadow-xl animate-fade-in-fast">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
        <h2 className="text-xl text-text-secondary mb-6">{page.title}</h2>
      </div>
      
      <div className="p-6 bg-background rounded-lg border border-border-color">
          <div className="prose max-w-none">
              <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>

          {page.asset && (
            <div className="my-6 p-4 border rounded-lg text-center bg-input-bg">
                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg p-8 flex items-center justify-center">
                  <div className="w-16 h-16 text-white/30">●</div>
                </div>
                <p className="text-sm text-text-secondary italic mt-2">{page.asset.title}</p>
            </div>
          )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 0}
          className="btn btn-secondary"
        >
          Previous
        </button>
        <p className="text-sm text-text-secondary">Page {currentPage + 1} of {module.contentPages.length}</p>
        {currentPage === module.contentPages.length - 1 ? (
          <button onClick={onComplete} className="btn btn-accent">
            Start Quiz
          </button>
        ) : (
          <button onClick={() => setCurrentPage(p => p + 1)} className="btn btn-primary">
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default TrainingModuleView;