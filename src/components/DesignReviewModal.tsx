import React, { useMemo } from 'react';
import { DesignFeedbackItem } from '../utils/types';
import FeedbackCategory from '../designReview/FeedbackCategory';
import { WarningIcon, SuggestionIcon, OpportunityIcon, InsightIcon } from './Icons';
import InfoModal from './InfoModal';

interface DesignReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackItems: DesignFeedbackItem[];
  title: string;
}

const iconMap: Record<string, React.ReactNode> = {
    'Warning': <WarningIcon className="h-6 w-6 text-yellow-500" />,
    'Suggestion': <SuggestionIcon className="h-6 w-6 text-blue-500" />,
    'Opportunity': <OpportunityIcon className="h-6 w-6 text-green-500" />,
    'Insight': <InsightIcon className="h-6 w-6 text-purple-500" />,
};

const DesignReviewModal: React.FC<DesignReviewModalProps> = ({ isOpen, onClose, feedbackItems, title }) => {
  const groupedFeedback = useMemo(() => {
    return feedbackItems.reduce((acc, item) => {
      const type = item.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {} as Record<string, DesignFeedbackItem[]>);
  }, [feedbackItems]);

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-3xl" title={title}>
      <div className="space-y-6">
          <FeedbackCategory title="Warnings" items={groupedFeedback['Warning']} icon={iconMap['Warning']} />
          <FeedbackCategory title="Suggestions" items={groupedFeedback['Suggestion']} icon={iconMap['Suggestion']} />
          <FeedbackCategory title="Opportunities" items={groupedFeedback['Opportunity']} icon={iconMap['Opportunity']} />
          <FeedbackCategory title="Insights" items={groupedFeedback['Insight']} icon={iconMap['Insight']} />
      </div>
    </InfoModal>
  );
};

export default DesignReviewModal;