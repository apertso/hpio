import React, { createContext, useContext, useState, useCallback } from "react";

interface PageTitleContextType {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  headerAction: React.ReactNode;
  setHeaderAction: (action: React.ReactNode) => void;
  headerRightAction: React.ReactNode;
  setHeaderRightAction: (action: React.ReactNode) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(
  undefined
);

export const PageTitleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pageTitle, setPageTitleState] = useState<string>("");
  const [headerAction, setHeaderActionState] = useState<React.ReactNode>(null);
  const [headerRightAction, setHeaderRightActionState] =
    useState<React.ReactNode>(null);

  const setPageTitle = useCallback((title: string) => {
    setPageTitleState(title);
  }, []);

  const setHeaderAction = useCallback((action: React.ReactNode) => {
    setHeaderActionState(action);
  }, []);

  const setHeaderRightAction = useCallback((action: React.ReactNode) => {
    setHeaderRightActionState(action);
  }, []);

  return (
    <PageTitleContext.Provider
      value={{
        pageTitle,
        setPageTitle,
        headerAction,
        setHeaderAction,
        headerRightAction,
        setHeaderRightAction,
      }}
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
