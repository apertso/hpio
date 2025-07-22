import React, { createContext, useState, useContext, useCallback } from "react";

interface ResetContextProps {
  resetKey: number;
  triggerReset: () => void;
}

const ResetContext = createContext<ResetContextProps | undefined>(undefined);

export const ResetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [resetKey, setResetKey] = useState(0);

  const triggerReset = useCallback(() => {
    setResetKey((prevKey) => prevKey + 1);
  }, []);

  const value = { resetKey, triggerReset };

  return (
    <ResetContext.Provider value={value}>{children}</ResetContext.Provider>
  );
};

export const useReset = () => {
  const context = useContext(ResetContext);
  if (context === undefined) {
    throw new Error("useReset must be used within a ResetProvider");
  }
  return context;
};
