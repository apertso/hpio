// src/pages/CategoriesPage.tsx
import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import {
  PencilIcon as PencilSolidIcon,
  PlusIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../components/Button"; // Import the Button component
import { InformationIcon } from "../components/InformationIcon";
import useApi from "../hooks/useApi"; // Import useApi
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import { CategoriesTable, Tooltip } from "../components"; // Import CategoriesTable from the index
import { BuiltinIcon } from "../utils/builtinIcons";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";

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

// MobileActionsOverlay component
const MobileActionsOverlay: React.FC<{
  category: Category | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}> = ({ category, shouldClose, onClose, onEdit, onDelete }) => {
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
    <MobilePanel
      isOpen={!!category}
      onClose={onClose}
      title=""
      shouldClose={shouldClose}
      enableBackdropClick={false}
    >
      <div className="flex justify-around items-center">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              action.handler();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
};
const CategoryListItem: React.FC<{
  category: Category;
  className?: string;
}> = ({ category, className }) => (
  <button
    type="button"
    data-mobile-list-item-id={category.id}
    className={`w-full text-left flex items-center justify-between p-4 card-base card-hover ${
      className || ""
    }`}
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
  const { setPageTitle, setHeaderAction } = usePageTitle();
  const metadata = getPageMetadata("categories");

  useEffect(() => {
    setPageTitle("Категории");
  }, [setPageTitle]);

  useEffect(() => {
    setHeaderAction(
      <Tooltip content="Категории группируют платежи и напрямую влияют на аналитику.">
        <button className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer">
          <InformationIcon className="h-[16px] w-[16px]" />
        </button>
      </Tooltip>
    );

    return () => setHeaderAction(null);
  }, [setHeaderAction]);


  // Use useApi for fetching the categories list
  const {
    data: categories,
    isLoading: isLoadingCategories,
    execute: executeFetchCategories,
  } = useApi<Category[]>(fetchCategoriesApi, {
    offlineDataKey: "categories",
  });

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
  const [shouldCloseMobilePanel, setShouldCloseMobilePanel] = useState(false);
  const selectedMobileCategoryId = mobileActionsCategory?.id ?? null;
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  // Effect to trigger the fetch on mount
  useEffect(() => {
    executeFetchCategories();
  }, []); // Removed executeFetchCategories to prevent infinite loop

  const navigate = useNavigate();

  const handleAddCategory = () => {
    navigate("/categories/new");
  };

  const handleEditCategory = (id: string) => {
    navigate(`/categories/edit/${id}`);
  };

  const closeMobilePanel = () => {
    setShouldCloseMobilePanel(true);
  };

  useEffect(() => {
    if (!selectedMobileCategoryId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (mobileListRef.current?.contains(target)) {
        return;
      }

      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      closeMobilePanel();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedMobileCategoryId, closeMobilePanel]);

  const handleMobilePanelClosed = () => {
    setMobileActionsCategory(null);
    setShouldCloseMobilePanel(false);
  };

  const handleMobileListClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) return;

    const itemElement = event.target.closest<HTMLElement>(
      "[data-mobile-list-item-id]"
    );

    if (itemElement?.dataset.mobileListItemId) {
      const { mobileListItemId } = itemElement.dataset;

      if (selectedMobileCategoryId === mobileListItemId) {
        closeMobilePanel();
        return;
      }

      const nextCategory = categories?.find(
        (categoryItem) => categoryItem.id === mobileListItemId
      );

      if (nextCategory) {
        setShouldCloseMobilePanel(false);
        setMobileActionsCategory(nextCategory);
      }
      return;
    }

    if (event.target === event.currentTarget && selectedMobileCategoryId) {
      closeMobilePanel();
    }
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
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center md:mb-6">
          <div className="flex items-center gap-2">
            <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Управление категориями
            </h2>
            <Tooltip content="Категории группируют платежи и напрямую влияют на аналитику.">
              <div className="hidden md:block p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer">
                <InformationIcon className="h-[16px] w-[16px]" />
              </div>
            </Tooltip>
          </div>
          <Button
            onClick={handleAddCategory}
            label="Добавить категорию"
            icon={<PlusIcon className="w-4 h-4" />}
            className="hidden md:inline-flex"
          />
        </div>

        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto card-base">
            <CategoriesTable
              data={categories || []}
              isLoading={isLoadingCategories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
          </div>
          {/* Mobile Card View */}
          {!isLoadingCategories && (
            <div
              ref={mobileListRef}
              onClick={handleMobileListClick}
              className="block md:hidden space-y-2"
            >
              {categories?.map((category) => {
                const isSelected = selectedMobileCategoryId === category.id;
                const cardStateClasses = [
                  "transition-all duration-200",
                  isSelected ? "border-gray-400 shadow-md relative z-50" : "",
                ]
                  .filter((cls) => cls)
                  .join(" ");
                return (
                  <CategoryListItem
                    key={category.id}
                    category={category}
                    className={cardStateClasses}
                  />
                );
              })}
            </div>
          )}
        </>
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
        shouldClose={shouldCloseMobilePanel}
        onClose={handleMobilePanelClosed}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
    </>
  );
};

export default CategoriesPage;
