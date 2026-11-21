import React, { createContext, useContext, useState } from 'react';

interface ColorAnimationContextType {
  isColorAnimEnabled: boolean;
  toggleColorAnim: () => void;
  setColorAnimEnabled: (enabled: boolean) => void;
}

const ColorAnimationContext = createContext<ColorAnimationContextType | undefined>(undefined);

export const ColorAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isColorAnimEnabled, setIsColorAnimEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ok_color_anim_enabled');
      return saved !== null ? saved === 'true' : true; // Default state: ON
    } catch {
      return true;
    }
  });

  const toggleColorAnim = () => {
    setIsColorAnimEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ok_color_anim_enabled', String(next));
      } catch (err) {
        console.warn('Failed to save color animation preference:', err);
      }
      return next;
    });
  };

  const setColorAnimEnabled = (enabled: boolean) => {
    setIsColorAnimEnabled(enabled);
    try {
      localStorage.setItem('ok_color_anim_enabled', String(enabled));
    } catch (err) {
      console.warn('Failed to save color animation preference:', err);
    }
  };

  return (
    <ColorAnimationContext.Provider
      value={{
        isColorAnimEnabled,
        toggleColorAnim,
        setColorAnimEnabled
      }}
    >
      {children}
    </ColorAnimationContext.Provider>
  );
};

export const useColorAnimation = (): ColorAnimationContextType => {
  const context = useContext(ColorAnimationContext);
  if (!context) {
    throw new Error('useColorAnimation must be used within a ColorAnimationProvider');
  }
  return context;
};
