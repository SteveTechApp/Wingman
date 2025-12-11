import { useState } from 'react';
import { RoomWizardAnswers } from '../utils/types';
import toast from 'react-hot-toast';

const validateStep = (stepIndex: number, answers: RoomWizardAnswers): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (stepIndex === 0) { // Basic Info Validation
        if (!answers.roomName.trim()) newErrors.roomName = 'Room name is required.';
        if (answers.dimensions.length <= 0) newErrors.length = 'Length must be > 0.';
        if (answers.dimensions.width <= 0) newErrors.width = 'Width must be > 0.';
        if (answers.dimensions.height <= 0) newErrors.height = 'Height must be > 0.';
        if (answers.maxParticipants <= 0) newErrors.maxParticipants = 'Participants must be > 0.';
    }
    return newErrors;
};

export const useWizardStepsAndValidation = (answers: RoomWizardAnswers, totalSteps: number) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleNext = () => {
        const stepErrors = validateStep(currentStep, answers);
        setErrors(stepErrors);
        if (Object.keys(stepErrors).length > 0) {
            toast.error('Please fill in all required fields correctly.');
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
    };

    const handlePrev = () => {
        setErrors({}); // Clear errors when going back
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    return { currentStep, errors, handleNext, handlePrev, setCurrentStep, setErrors };
};