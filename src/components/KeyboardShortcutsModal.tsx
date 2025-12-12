import React from 'react';
import InfoModal from './InfoModal';
import { KeyboardShortcut, getShortcutLabel } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose, shortcuts }) => {
  // Group shortcuts by category
  const groupedShortcuts: Record<string, KeyboardShortcut[]> = {
    'Navigation': shortcuts.filter(s => s.description.includes('Navigate') || s.description.includes('Go to')),
    'Actions': shortcuts.filter(s => s.description.includes('New') || s.description.includes('Save') || s.description.includes('Open')),
    'UI': shortcuts.filter(s => s.description.includes('Toggle') || s.description.includes('Show') || s.description.includes('Close')),
    'Other': shortcuts.filter(s =>
      !s.description.includes('Navigate') &&
      !s.description.includes('Go to') &&
      !s.description.includes('New') &&
      !s.description.includes('Save') &&
      !s.description.includes('Open') &&
      !s.description.includes('Toggle') &&
      !s.description.includes('Show') &&
      !s.description.includes('Close')
    ),
  };

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
          if (categoryShortcuts.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-lg font-bold mb-3 text-text-primary">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 px-3 rounded-md hover:bg-background-secondary"
                  >
                    <span className="text-text-primary">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-sm font-mono bg-input-bg border border-border-color rounded shadow-sm">
                      {getShortcutLabel(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-border-color">
          <p className="text-sm text-text-secondary">
            Press <kbd className="px-2 py-1 text-xs font-mono bg-input-bg border border-border-color rounded">?</kbd> to toggle this help dialog
          </p>
        </div>
      </div>
    </InfoModal>
  );
};

export default KeyboardShortcutsModal;
