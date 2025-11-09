import React, { createContext, useContext, useState, useCallback } from "react";

interface PageTitleContextType {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  headerAction: React.ReactNode;
  setHeaderAction: (action: React.ReactNode) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(
  undefined
);

export const PageTitleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pageTitle, setPageTitleState] = useState<string>("");
  const [headerAction, setHeaderActionState] = useState<React.ReactNode>(null);

  const setPageTitle = useCallback((title: string) => {
    setPageTitleState(title);
  }, []);

  const setHeaderAction = useCallback((action: React.ReactNode) => {
    setHeaderActionState(action);
  }, []);

  return (
    <PageTitleContext.Provider
      value={{ pageTitle, setPageTitle, headerAction, setHeaderAction }}
    >
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => {
  const context = useContext(PageTitleContext);
  if (context === undefined) {
    throw new Error("usePageTitle must be used within a PageTitleProvider");
  }
  return context;
};
