
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useProjectGeneration } from '../hooks/useProjectGeneration';

type GenerationContextType = ReturnType<typeof useProjectGeneration>;

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const GenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const generationData = useProjectGeneration();
    
    // Destructure to ensure dependencies are clear
    const {
        handleAgentSubmit,
        handleProjectSetupSubmit,
        handleSurveyImport,
        handleStartFromTemplate,
        handleDesignRoom,
        handleGenerateDiagram,
        handleGenerateProposal,
        handleValueEngineerRoom
    } = generationData;

    const value = useMemo(() => ({
        handleAgentSubmit,
        handleProjectSetupSubmit,
        handleSurveyImport,
        handleStartFromTemplate,
        handleDesignRoom,
        handleGenerateDiagram,
        handleGenerateProposal,
        handleValueEngineerRoom
    }), [
        handleAgentSubmit,
        handleProjectSetupSubmit,
        handleSurveyImport,
        handleStartFromTemplate,
        handleDesignRoom,
        handleGenerateDiagram,
        handleGenerateProposal,
        handleValueEngineerRoom
    ]);

    return (
        <GenerationContext.Provider value={value}>
            {children}
        </GenerationContext.Provider>
    );
};

export const useGenerationContext = () => {
    const context = useContext(GenerationContext);
    if (context === undefined) {
        throw new Error('useGenerationContext must be used within a GenerationProvider');
    }
    return context;
};