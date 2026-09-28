import React, { createContext, useContext, useState, useEffect } from 'react';

interface CompareContextType {
  compareIds: string[];
  addToCompare: (id: string) => boolean;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cbf10_compare');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cbf10_compare', JSON.stringify(compareIds));
    } catch (e) {
      console.error(e);
    }
  }, [compareIds]);

  const addToCompare = (id: string): boolean => {
    if (compareIds.includes(id)) return false;
    if (compareIds.length >= 4) {
      alert('You can compare a maximum of 4 batteries simultaneously.');
      return false;
    }
    setCompareIds(prev => [...prev, id]);
    return true;
  };

  const removeFromCompare = (id: string) => {
    setCompareIds(prev => prev.filter(i => i !== id));
  };

  const clearCompare = () => {
    setCompareIds([]);
  };

  const isInCompare = (id: string) => compareIds.includes(id);

  return (
    <CompareContext.Provider value={{ compareIds, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within a CompareProvider');
  return context;
};
