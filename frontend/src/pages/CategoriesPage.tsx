// src/pages/CategoriesPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import Modal from "../components/Modal"; // Используем наше модальное окно
import { useForm, SubmitHandler } from "react-hook-form"; // Для формы категории
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline"; // Иконки действий

// Интерфейс для данных категории
interface Category {
  id: string;
  name: string;
  // TODO: Добавить другие поля категории, если они есть (иконка, цвет)
}

// Схема валидации для формы категории
const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
  // TODO: Добавить валидацию других полей
});

// Тип данных формы категории
type CategoryFormInputs = z.infer<typeof categoryFormSchema>;

const CategoriesPage: React.FC = () => {
  // Состояние для хранения списка категорий
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);

  // Состояние для модального окна формы категории
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<
    string | undefined
  >(undefined); // ID категории для редактирования

  // Состояние формы категории (используем useForm внутри компонента страницы)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<CategoryFormInputs>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  // Состояние для общей ошибки формы (с бэкенда)
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false); // Флаг загрузки формы (при редактировании)

  // Функция для загрузки категорий
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setErrorCategories(null);
    try {
      const res = await axiosInstance.get("/categories");
      setCategories(res.data);
      logger.info(`Successfully fetched ${res.data.length} categories.`);
    } catch (error: any) {
      logger.error(
        "Failed to fetch categories:",
        error.response?.data?.message || error.message
      );
      setErrorCategories("Не удалось загрузить список категорий.");
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Эффект для загрузки категорий при монтировании
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- Обработчики модального окна и формы ---

  // Открытие модального окна (для создания или редактирования)
  const handleOpenModal = (categoryId?: string) => {
    setEditingCategoryId(categoryId);
    setFormError(null); // Сбрасываем ошибки формы
    reset({ name: "" }); // Сбрасываем форму

    if (categoryId) {
      // Если режим редактирования, загружаем данные категории
      setIsLoadingForm(true);
      axiosInstance
        .get(`/categories/${categoryId}`)
        .then((res) => {
          setValue("name", res.data.name); // Заполняем поле name
          // TODO: Заполнить другие поля, если есть
        })
        .catch((error) => {
          logger.error(
            `Failed to fetch category ${categoryId} for edit:`,
            error
          );
          setFormError("Не удалось загрузить данные категории."); // Ошибка загрузки данных
          // TODO: Возможно, закрыть модалку или показать сообщение и возможность закрыть
        })
        .finally(() => {
          setIsLoadingForm(false);
          setIsModalOpen(true); // Открываем модалку после попытки загрузки
        });
    } else {
      // Режим создания
      setIsLoadingForm(false);
      setIsModalOpen(true);
    }
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategoryId(undefined);
    setFormError(null); // Сбросить ошибку формы
    reset(); // Полностью сбросить форму
  };

  // Отправка формы (создание или редактирование)
  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    setFormError(null);
    try {
      if (editingCategoryId) {
        // Редактирование
        await axiosInstance.put(`/categories/${editingCategoryId}`, data);
        logger.info(`Category updated: ${editingCategoryId}`);
        alert("Категория успешно обновлена!"); // Временное уведомление
      } else {
        // Создание
        await axiosInstance.post("/categories", data);
        logger.info("Category created");
        alert("Категория успешно добавлена!"); // Временное уведомление
      }
      handleCloseModal(); // Закрыть модалку
      fetchCategories(); // Перезагрузить список категорий
    } catch (error: any) {
      logger.error(
        "Failed to save category:",
        error.response?.data?.message || error.message
      );
      setFormError(
        error.response?.data?.message || "Произошла ошибка при сохранении."
      ); // Отобразить ошибку с бэкенда
    }
  };

  // Удаление категории
  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string
  ) => {
    // TODO: Добавить информацию о связанных платежах в подтверждение (см. логику в backend deleteCategory)
    // Если мы запретили удаление при наличии платежей, бэкенд вернет ошибку 400.
    // Если разрешили (SET NULL), то просто удаляем.
    if (
      window.confirm(
        `Вы уверены, что хотите удалить категорию "${categoryName}"? Связанные платежи останутся без категории.`
      )
    ) {
      try {
        await axiosInstance.delete(`/categories/${categoryId}`);
        logger.info(`Category deleted: ${categoryId}`);
        fetchCategories(); // Перезагрузить список
        alert("Категория успешно удалена."); // Временное уведомление
      } catch (error: any) {
        logger.error(
          `Failed to delete category ${categoryId}:`,
          error.response?.data?.message || error.message
        );
        // Обработка ошибки, если удаление запрещено из-за связанных платежей
        alert(
          `Не удалось удалить категорию "${categoryName}": ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  return (
    <div className="dark:text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Управление категориями
        </h2>
        <button
          onClick={() => handleOpenModal()} // Открываем модалку для создания (без ID)
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          Добавить категорию
        </button>
      </div>

      {/* Состояния загрузки/ошибки списка */}
      {isLoadingCategories && (
        /* ... */ <div className="text-center text-gray-700 dark:text-gray-300">
          Загрузка категорий...
        </div>
      )}
      {errorCategories && (
        /* ... */ <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          {" "}
          {errorCategories}{" "}
        </div>
      )}

      {/* Список категорий */}
      {!isLoadingCategories && !errorCategories && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          {categories.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Название
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-100"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                      <button
                        onClick={() => handleOpenModal(category.id)} // Редактировать категорию
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-5 w-5" />{" "}
                        {/* Иконка редактирования */}
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCategory(category.id, category.name)
                        } // Удалить категорию
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1"
                        title="Удалить"
                      >
                        <TrashIcon className="h-5 w-5" />{" "}
                        {/* Иконка удаления */}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-gray-700 dark:text-gray-300">
              Нет категорий. Добавьте первую!
            </div>
          )}
        </div>
      )}

      {/* Модальное окно для формы категории */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingCategoryId ? "Редактировать категорию" : "Добавить категорию"
        }
      >
        {/* Форма категории внутри модалки */}
        {isLoadingForm ? ( // Пока загружаются данные категории для редактирования
          <div className="text-center dark:text-gray-200">
            Загрузка данных категории...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formError && ( // Общая ошибка формы
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{formError}</span>
              </div>
            )}
            <div>
              <label
                htmlFor="category-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Название категории
              </label>
              <input
                id="category-name"
                type="text"
                {...register("name")}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
                  errors.name ? "border-red-500" : ""
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* TODO: Добавить поля для иконки/цвета категории */}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Сохранение..."
                  : editingCategoryId
                  ? "Сохранить изменения"
                  : "Добавить категорию"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default CategoriesPage;
