import { useState, useCallback, useRef } from 'react';

export interface Command<T> {
  execute: (state: T) => T;
  undo: (state: T) => T;
  description: string;
}

export interface UndoRedoState<T> {
  past: Command<T>[];
  future: Command<T>[];
}

export const useUndoRedo = <T,>(initialState: T, maxHistory = 50) => {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    future: [],
  });
  const stateRef = useRef(state);

  // Update ref when state changes
  stateRef.current = state;

  const execute = useCallback((command: Command<T>) => {
    const newState = command.execute(stateRef.current);
    setState(newState);
    stateRef.current = newState;

    setHistory(prev => ({
      past: [...prev.past.slice(-maxHistory + 1), command],
      future: [], // Clear future when new command is executed
    }));
  }, [maxHistory]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const command = prev.past[prev.past.length - 1];
      const newState = command.undo(stateRef.current);
      setState(newState);
      stateRef.current = newState;

      return {
        past: prev.past.slice(0, -1),
        future: [command, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const command = prev.future[0];
      const newState = command.execute(stateRef.current);
      setState(newState);
      stateRef.current = newState;

      return {
        past: [...prev.past, command],
        future: prev.future.slice(1),
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const clear = useCallback(() => {
    setHistory({ past: [], future: [] });
  }, []);

  const reset = useCallback((newState: T) => {
    setState(newState);
    stateRef.current = newState;
    setHistory({ past: [], future: [] });
  }, []);

  return {
    state,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    reset,
    historySize: history.past.length,
    lastCommand: history.past[history.past.length - 1]?.description,
  };
};

// Helper to create simple property change commands
export const createPropertyCommand = <T, K extends keyof T>(
  key: K,
  newValue: T[K],
  description?: string
): Command<T> => {
  let oldValue: T[K];

  return {
    execute: (state: T) => {
      oldValue = state[key];
      return { ...state, [key]: newValue };
    },
    undo: (state: T) => {
      return { ...state, [key]: oldValue };
    },
    description: description || `Change ${String(key)}`,
  };
};

// Helper to create array item commands
export const createArrayCommand = <T, Item>(
  key: keyof T,
  operation: 'add' | 'remove' | 'update',
  item: Item,
  index?: number
): Command<T> => {
  return {
    execute: (state: T) => {
      const array = state[key] as unknown as Item[];
      let newArray: Item[];

      switch (operation) {
        case 'add':
          newArray = [...array, item];
          break;
        case 'remove':
          newArray = array.filter((_, i) => i !== index);
          break;
        case 'update':
          newArray = array.map((el, i) => (i === index ? item : el));
          break;
        default:
          newArray = array;
      }

      return { ...state, [key]: newArray } as T;
    },
    undo: (state: T) => {
      const array = state[key] as unknown as Item[];
      let newArray: Item[];

      switch (operation) {
        case 'add':
          newArray = array.slice(0, -1);
          break;
        case 'remove':
          newArray = [...array.slice(0, index), item, ...array.slice(index!)];
          break;
        case 'update':
          const originalItem = array[index!];
          newArray = array.map((el, i) => (i === index ? originalItem : el));
          break;
        default:
          newArray = array;
      }

      return { ...state, [key]: newArray } as T;
    },
    description: `${operation} item in ${String(key)}`,
  };
};
