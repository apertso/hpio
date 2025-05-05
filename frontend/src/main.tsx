import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext.tsx"; // Импорт ThemeProvider
import { BrowserRouter } from "react-router-dom"; // Для роутинга

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      {" "}
      {/* Обертываем в ThemeProvider */}
      <BrowserRouter>
        {" "}
        {/* Обертываем в BrowserRouter для роутинга */}
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
