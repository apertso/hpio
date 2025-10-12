import React, { createContext, useContext, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import Toast, { ToastProps, ToastType } from "../components/Toast";

interface ToastContextProps {
  showToast: (
    message: string,
    type: ToastType,
    duration?: number,
    action?: { label: string; onClick: () => void }
  ) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType,
      duration?: number,
      action?: { label: string; onClick: () => void }
    ) => {
      const id = new Date().toISOString();
      setToasts((prevToasts) => [
        ...prevToasts,
        { id, message, type, duration, action },
      ]);
    },
    []
  );

  const handleClose = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {ReactDOM.createPortal(
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 space-y-2 safe-area-top safe-area-bottom">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={handleClose} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
