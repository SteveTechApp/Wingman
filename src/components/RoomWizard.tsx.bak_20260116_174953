import React from 'react';
import { useRoomWizard } from '../hooks/useRoomWizard';
import { RoomData } from '../utils/types';
import InfoModal from './InfoModal';
import WizardNavigation from './roomWizard/WizardNavigation';
import StepBasicInfo from './roomWizard/StepBasicInfo';
import StepOutputs from './roomWizard/StepOutputs';
import StepInputs from './roomWizard/StepInputs';
import StepAudio from './roomWizard/StepAudio';
import StepFeatures from './roomWizard/StepFeatures';
import StepEnvironment from './roomWizard/StepEnvironment';
import StepAVoIPNetwork from './roomWizard/StepAVoIPNetwork';
import StepBudget from './roomWizard/StepBudget';

interface RoomWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roomData: RoomData) => void;
  initialData: RoomData | null;
}

const stepComponents = [
  { title: 'Basic Info', component: StepBasicInfo },
  { title: 'Output Designer', component: StepOutputs },
  { title: 'Source Designer', component: StepInputs },
  { title: 'Features', component: StepFeatures },
  { title: 'Audio', component: StepAudio },
  { title: 'Environment & Control', component: StepEnvironment },
  { title: 'AVoIP Network', component: StepAVoIPNetwork },
  { title: 'Budget & Tier', component: StepBudget },
];

const STEPS = stepComponents.map(s => s.title);

const RoomWizard: React.FC<RoomWizardProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const {
    currentStep,
    answers,
    errors,
    updateAnswers,
    handleNext,
    handlePrev,
    handleSave,
    handleSaveProgress,
    isFirstStep,
    isLastStep,
  } = useRoomWizard(initialData, onSave, stepComponents.length);

  if (!isOpen) return null;

  const renderStepContent = () => {
    const StepComponent = stepComponents[currentStep].component;
    return <StepComponent answers={answers} updateAnswers={updateAnswers} errors={errors} />;
  };

  const title = (
    <div>
      <h2 className="text-2xl font-bold text-text-primary">Room Configuration Wizard</h2>
      <p className="text-sm text-text-secondary">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}</p>
    </div>
  );

  const footer = (
    <WizardNavigation
      onNext={handleNext}
      onPrev={handlePrev}
      onSave={() => {
        if (handleSave()) {
            onClose();
        }
      }}
      onSaveProgress={handleSaveProgress}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      onClose={onClose}
    />
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-4xl" title={title} footer={footer}>
      {renderStepContent()}
    </InfoModal>
  );
};

export default RoomWizard;