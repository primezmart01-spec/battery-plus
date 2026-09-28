import React, { createContext, useContext, useState, useEffect } from 'react';

interface StoreSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/catalog/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
      }
    } catch (err) {
      console.error('Failed to load store settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();

    const handleUpdate = () => {
      refreshSettings();
    };

    window.addEventListener('store-settings-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('store-settings-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
