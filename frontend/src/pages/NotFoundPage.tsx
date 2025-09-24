import React from "react";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const NotFoundPage: React.FC = () => {
  const metadata = getPageMetadata("404");

  return (
    <>
      <PageMeta {...metadata} />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        <h1 className="text-4xl font-bold mb-4">404 - Страница не найдена</h1>
        <p className="text-lg">
          Извините, страница, которую вы ищете, не существует.
        </p>
        {/* TODO: Добавить ссылку на главную */}
      </div>
    </>
  );
};

export default NotFoundPage;
