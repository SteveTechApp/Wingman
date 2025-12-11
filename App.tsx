import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from './context/ProjectContext';
import { useKeyboardShortcuts, KeyboardShortcut } from './hooks/useKeyboardShortcuts';

import ErrorBoundary from './components/ErrorBoundary';
import ContextualLoadingUI from './components/loading/ContextualLoadingUI';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import AppRoutes from './AppRoutes';

const App: React.FC = () => {
    const { appState } = useProjectContext();
    const navigate = useNavigate();
    const isGenerating = appState === 'generating';
    const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

    // Define global keyboard shortcuts
    const shortcuts: KeyboardShortcut[] = [
        {
            key: '?',
            shift: true,
            description: 'Show keyboard shortcuts',
            action: () => setIsShortcutsModalOpen(prev => !prev),
        },
        {
            key: 'h',
            description: 'Go to home',
            action: () => navigate('/'),
        },
        {
            key: 'd',
            description: 'Go to design copilot',
            action: () => navigate('/design'),
        },
        {
            key: 'p',
            description: 'Go to proposals',
            action: () => navigate('/proposals'),
        },
        {
            key: 't',
            description: 'Go to templates',
            action: () => navigate('/templates'),
        },
        {
            key: 'l',
            description: 'Go to learning center',
            action: () => navigate('/learn'),
        },
        {
            key: 'k',
            ctrl: true,
            description: 'Open search',
            action: () => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                searchInput?.focus();
            },
        },
        {
            key: 'z',
            ctrl: true,
            description: 'Undo last action',
            action: () => {
                window.dispatchEvent(new CustomEvent('undo'));
            },
        },
        {
            key: 'z',
            ctrl: true,
            shift: true,
            description: 'Redo last action',
            action: () => {
                window.dispatchEvent(new CustomEvent('redo'));
            },
        },
    ];

    useKeyboardShortcuts(shortcuts);

    return (
        <ErrorBoundary>
            <AppRoutes />
            {isGenerating && <ContextualLoadingUI />}
            <KeyboardShortcutsModal
                isOpen={isShortcutsModalOpen}
                onClose={() => setIsShortcutsModalOpen(false)}
                shortcuts={shortcuts}
            />
        </ErrorBoundary>
    );
};

export default App;
