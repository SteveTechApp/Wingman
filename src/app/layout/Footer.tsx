
import * as React from "react";
import { ChatBubbleIcon } from '@/components/icons/UIIcons';
interface FooterProps {
  onFeedbackClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onFeedbackClick }) => {
  return (
    <footer className="bg-background-secondary\ border-t\ border-border-color\ print:hidden\ flex-shrink-0">
      <div className="container\ mx-auto\ px-4\ py-3\ flex\ justify-between\ items-center\ text-xs\ text-text-secondary\ gap-4">
        <div className="text-left\ flex-shrink-0">
          <p className="whitespace-nowrap">
            &copy; {new Date().getFullYear()} WyreStorm Technologies. AI Wingman is a technology concept.
          </p>
        </div>
        <div className="text-right\ flex-shrink-0">
          <button 
            onClick={onFeedbackClick} 
            className="flex\ items-center\ gap-1\.5\ font-medium\ hover:text-accent\ hover:underline\ transition-colors\ whitespace-nowrap"
          >
            <ChatBubbleIcon className="h-4\ w-4\ flex-shrink-0" />
            Submit Feedback
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



