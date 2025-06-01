import React from "react";

const NotFoundPage: React.FC = () => {
  return (
    <>
      <title>Мои Платежи - Страница не найдена</title>
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
