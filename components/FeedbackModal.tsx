import React, { useState } from 'react';
import InfoModal from './InfoModal';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback.');
      return;
    }
    setIsSubmitting(true);
    // Simulate sending feedback
    // In a real app, this would be an API call.
    setTimeout(() => {
      console.log('Feedback Submitted:', { type: feedbackType, text: feedbackText });
      toast.success('Thank you for your feedback!');
      setIsSubmitting(false);
      setFeedbackText('');
      setFeedbackType('general');
      onClose();
    }, 1000);
  };

  const footer = (
    <>
      <button onClick={onClose} className="btn btn-secondary">Cancel</button>
      <button type="submit" form="feedback-form" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-lg" title="Submit Feedback" footer={footer}>
      <form id="feedback-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedback-type" className="block text-sm font-medium">Feedback Type</label>
          <select
            id="feedback-type"
            value={feedbackType}
            onChange={e => setFeedbackType(e.target.value)}
            className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1"
          >
            <option value="general">General Feedback</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>
        <div>
          <label htmlFor="feedback-text" className="block text-sm font-medium">Details</label>
          <textarea
            id="feedback-text"
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            className="w-full h-40 p-2 border border-border-color rounded-md bg-input-bg mt-1 resize-y"
            placeholder="Please provide as much detail as possible..."
            required
          />
        </div>
      </form>
    </InfoModal>
  );
};

export default FeedbackModal;