import { useEffect } from 'react';
import { RoomData, RoomWizardAnswers } from '../utils/types';
import { useWizardState } from './useWizardState';
import { useWizardStepsAndValidation } from './useWizardStepsAndValidation';
import toast from 'react-hot-toast';

export const useRoomWizard = (
    initialData: RoomData | null, 
    onSave: (roomData: RoomData) => void, 
    totalSteps: number
) => {
    const { answers, updateAnswers, createInitialAnswers } = useWizardState(initialData);
    
    const {
        currentStep,
        errors,
        handleNext,
        handlePrev,
        setCurrentStep,
        setErrors,
    } = useWizardStepsAndValidation(answers, totalSteps);

    useEffect(() => {
        updateAnswers(createInitialAnswers(initialData));
        setErrors({});
        setCurrentStep(0);
    }, [initialData]);

    const handleSave = (): boolean => {
        const finalRoomData: RoomData = {
            ...answers,
            id: initialData?.id || answers.id || '',
            systemDiagram: initialData?.systemDiagram,
            manuallyAddedEquipment: initialData?.manuallyAddedEquipment || [],
        };
        onSave(finalRoomData);
        return true;
    };

    const handleSaveProgress = () => {
        handleSave();
        toast.success('Progress saved!');
    };

    return {
        currentStep,
        answers,
        errors,
        updateAnswers,
        handleNext,
        handlePrev,
        handleSave,
        handleSaveProgress,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === totalSteps - 1,
    };
};