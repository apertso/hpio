// src/pages/CategoriesPage.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline"; // Иконки действий
import {
  PencilIcon as PencilSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../components/Button"; // Import the Button component
import useApi from "../hooks/useApi"; // Import useApi
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import { BuiltinIcon } from "../utils/builtinIcons";

// Интерфейс для данных категории
interface Category {
  id: string;
  name: string;
  builtinIconName?: BuiltinIcon | null;
}

// Define the raw API fetch function for categories list
const fetchCategoriesApi = async (): Promise<Category[]> => {
  const res = await axiosInstance.get("/categories");
  return res.data;
};

// MobileActionsOverlay and CategoryListItem components
const MobileActionsOverlay: React.FC<{
  category: Category | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}> = ({ category, onClose, onEdit, onDelete }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  React.useEffect(() => {
    if (category) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [category]);
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };
  if (!category) return null;
  const actions = [
    {
      label: "Изменить",
      icon: PencilSolidIcon,
      handler: () => onEdit(category.id),
    },
    {
      label: "Удалить",
      icon: TrashSolidIcon,
      handler: () => onDelete(category.id, category.name),
    },
  ];
  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${
        isVisible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-lg transform transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-around items-center">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.handler();
                handleClose();
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
const CategoryListItem: React.FC<{
  category: Category;
  onClick: () => void;
}> = ({ category, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center gap-4">
      <PaymentIconDisplay
        payment={{ id: category.id, builtinIconName: category.builtinIconName }}
        sizeClass="h-8 w-8"
      />
      <p className="font-medium text-gray-900 dark:text-gray-100">
        {category.name}
      </p>
    </div>
  </button>
);

const CategoriesPage: React.FC = () => {
  const { showToast } = useToast(); // Import useToast

  // Use useApi for fetching the categories list
  const {
    data: categories,
    isLoading: isLoadingCategories,
    execute: executeFetchCategories,
  } = useApi<Category[]>(fetchCategoriesApi);

  // New state for confirm modal
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);
  const [mobileActionsCategory, setMobileActionsCategory] =
    useState<Category | null>(null);

  // Effect to trigger the fetch on mount
  useEffect(() => {
    executeFetchCategories();
  }, [executeFetchCategories]); // Dependency on executeFetchCategories

  const navigate = useNavigate();

  const handleAddCategory = () => {
    navigate("/categories/new");
  };

  const handleEditCategory = (id: string) => {
    navigate(`/categories/edit/${id}`);
  };

  const onConfirmAction = async () => {
    if (confirmModalState.action) {
      setIsConfirming(true);
      await confirmModalState.action();
      setIsConfirming(false);
    }
    setConfirmModalState({
      isOpen: false,
      action: null,
      title: "",
      message: "",
    });
  };

  // Удаление категории
  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string
  ) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/categories/${categoryId}`);
        executeFetchCategories();
        showToast("Категория успешно удалена.", "success");
      } catch {
        showToast("Не удалось удалить категорию. Попробуйте позже.", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить категорию",
      message: `Вы уверены, что хотите удалить категорию "${categoryName}"? Связанные платежи останутся без категории.`,
    });
  };

  return (
    <>
      <title>Хочу Плачу - Категории</title>
      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Управление категориями
          </h2>
          <Button onClick={handleAddCategory} label="Добавить категорию" />
        </div>

        <p className="mb-6">
          Категории позволяют навести порядок в ваших расходах: они используются
          при просмотре платежей, в архиве и в статистике на главной странице.
        </p>

        {/* Состояния загрузки/ошибки списка */}
        {isLoadingCategories && (
          <div className="flex justify-center items-center py-10">
            <Spinner />
          </div>
        )}
        {!isLoadingCategories && (
          <>
            {categories && categories.length > 0 ? ( // Check if categories is not null and has length
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          Иконка
                        </th>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <PaymentIconDisplay
                              payment={{
                                id: category.id,
                                builtinIconName: category.builtinIconName,
                              }}
                              sizeClass="h-6 w-6"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {category.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                            <button
                              onClick={() => handleEditCategory(category.id)} // Редактировать категорию
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1 cursor-pointer"
                              title="Редактировать"
                            >
                              <PencilIcon className="h-5 w-5" />{" "}
                              {/* Иконка редактирования */}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteCategory(category.id, category.name)
                              } // Удалить категорию
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1 cursor-pointer"
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
                </div>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-2 p-2">
                  {categories.map((category) => (
                    <CategoryListItem
                      key={category.id}
                      category={category}
                      onClick={() => setMobileActionsCategory(category)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-gray-700 dark:text-gray-300">
                Нет категорий. Добавьте первую!
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() =>
          setConfirmModalState({
            isOpen: false,
            action: null,
            title: "",
            message: "",
          })
        }
        onConfirm={onConfirmAction}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Да, удалить"
        isConfirming={isConfirming}
      />
      <MobileActionsOverlay
        category={mobileActionsCategory}
        onClose={() => setMobileActionsCategory(null)}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
    </>
  );
};

export default CategoriesPage;
