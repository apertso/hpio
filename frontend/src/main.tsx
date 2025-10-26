import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { ResetProvider } from "./context/ResetContext";
import { OfflineProvider } from "./context/OfflineContext.tsx";
import { PageTitleProvider } from "./context/PageTitleContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { initializeErrorHandlers } from "./utils/errorHandlers";
import { initializeFreezeDetector } from "./utils/freezeDetector";
import logger from "./utils/logger";

initializeErrorHandlers();
initializeFreezeDetector();
logger.info("Application initialized");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <ResetProvider>
                <OfflineProvider>
                  <PageTitleProvider>
                    <App />
                  </PageTitleProvider>
                </OfflineProvider>
              </ResetProvider>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
