import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext.tsx"; // Импорт ThemeProvider
import { BrowserRouter } from "react-router-dom"; // Для роутинга
import { AuthProvider } from "./context/AuthContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { ResetProvider } from "./context/ResetContext";
import { OfflineProvider } from "./context/OfflineContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ResetProvider>
              <OfflineProvider>
                <App />
              </OfflineProvider>
            </ResetProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
