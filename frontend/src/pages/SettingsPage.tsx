import React from "react";

const SettingsPage: React.FC = () => {
  return (
    <>
      <title>Хочу Плачу - Настройки</title>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h2 className="text-2xl font-bold mb-4">Настройки</h2>
        <p>Здесь будут настройки пользователя.</p>
        {/* TODO: Добавить компоненты для изменения пароля, email, настроек уведомлений, темы */}
      </div>
    </>
  );
};

export default SettingsPage;
