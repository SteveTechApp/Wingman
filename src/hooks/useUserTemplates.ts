
import * as React from "react";
import { UserTemplate } from '../utils/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import toast from 'react-hot-toast';

export const useUserTemplates = () => {
    const [userTemplates, setUserTemplates] = useLocalStorage<UserTemplate[]>('userTemplates', DEFAULT_TEMPLATES);

    const handleSaveTemplate = React.useCallback((template: UserTemplate) => {
        setUserTemplates(prev => [...prev, template]);
        toast.success(`Template "${template.templateName}" saved!`);
    }, [setUserTemplates]);

    const handleDeleteTemplate = React.useCallback((templateId: string) => {
        setUserTemplates(prev => prev.filter(t => t.templateId !== templateId));
        toast.success('Template deleted.');
    }, [setUserTemplates]);
    
    return {
        userTemplates,
        handleSaveTemplate,
        handleDeleteTemplate,
    };
};



