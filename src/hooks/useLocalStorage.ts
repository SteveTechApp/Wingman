import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        // Basic validation: check if parsed value is of similar type to default
        if (typeof parsed !== typeof defaultValue && defaultValue !== null) {
          console.warn(`localStorage key "${key}" has unexpected type. Clearing corrupted data.`);
          localStorage.removeItem(key);
          return defaultValue;
        }
        return parsed;
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        // Clear corrupted data to prevent future errors
        localStorage.removeItem(key);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export const useLocalStorage = <T,>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};
