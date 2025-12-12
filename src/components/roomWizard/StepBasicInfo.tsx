import React from 'react';
import { RoomWizardAnswers } from '../../utils/types';
import RoomDetailsInputs from './basicInfo/RoomDetailsInputs';
import RoomSpecsInputs from './basicInfo/RoomSpecsInputs';

interface StepBasicInfoProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
  errors: Record<string, string>;
}

const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ answers, updateAnswers, errors }) => {
  return (
    <div className="space-y-8">
      <RoomDetailsInputs answers={answers} updateAnswers={updateAnswers} errors={errors} />
      <RoomSpecsInputs answers={answers} updateAnswers={updateAnswers} errors={errors} />
    </div>
  );
};

export default StepBasicInfo;