import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../data/constants';
import { LanguageCode } from '../../utils/types';
import InfoModal from '../InfoModal';

interface TranslateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (language: LanguageCode) => void;
}

const TranslateProposalModal: React.FC<TranslateProposalModalProps> = ({ isOpen, onClose, onTranslate }) => {
  const [targetLang, setTargetLang] = useState<LanguageCode>('fr-FR');

  const footer = (
    <>
      <button onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">Cancel</button>
      <button onClick={() => onTranslate(targetLang)} className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-2 px-4 rounded-md">Translate</button>
    </>
  );

  return (
    <InfoModal 
        isOpen={isOpen} 
        onClose={onClose} 
        className="max-w-md" 
        title="Translate Proposal" 
        footer={footer}
    >
      <div className="space-y-4">
        <label htmlFor="translate-language" className="block text-sm">Select a language to translate the executive summary and scope of work using AI.</label>
        <select
          id="translate-language"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
          className="w-full p-2 border rounded-md bg-input-bg mt-1"
        >
          {SUPPORTED_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
        </select>
      </div>
    </InfoModal>
  );
};

export default TranslateProposalModal;