// src/pages/CategoriesPage.tsx
import { useLanguage } from "../context/LanguageContext";
import {
  HeaderViewMenu,
  PageHeader,
  Panel,
} from "../components/layout/Page";
import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import useApi from "../hooks/useApi"; // Import useApi
import getErrorMessage from "../utils/getErrorMessage";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import { CategoriesTable } from "../components";
import type { SegmentedControlOption } from "../components/SegmentedControl";
import { BuiltinIcon } from "../utils/builtinIcons";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import MobilePanel from "../components/MobilePanel";
import MobileActionBar from "../components/MobileActionBar";
// Иконки меню действий на мобильных — единый контурный набор
import {
  PencilSquareIcon as PencilOutlineIcon,
  TrashIcon as TrashOutlineIcon,
} from "@heroicons/react/24/outline";

import { usePageTitle } from "../context/PageTitleContext";
import { localizedCategoryName } from "../utils/categoryLabel";

// Интерфейс для данных категории
interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  type?: "expense" | "income";
  builtinIconName?: BuiltinIcon | null;
}

type CategoryTabType = "expense" | "income";

const categoryTabOptions: SegmentedControlOption<CategoryTabType>[] = [
  { value: "expense", label: "Расход" },
  { value: "income", label: "Доход" },
];

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
  const { t, language } = useLanguage();
  if (!category) return null;

  const actions = [
    {
      label: t("Изменить"),
      icon: PencilOutlineIcon,
      handler: () => onEdit(category.id),
    },
    {
      label: t("Удалить"),
      icon: TrashOutlineIcon,
      tone: "destructive" as const,
      handler: () =>
        onDelete(category.id, localizedCategoryName(category, language)),
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
      <MobileActionBar actions={actions} onAfterSelect={onClose} />
    </MobilePanel>
  );
};
const CategoryListItem: React.FC<{
  category: Category;
  className?: string;
}> = ({ category, className }) => {
  const { language } = useLanguage();
  return (
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
        {localizedCategoryName(category, language)}
      </p>
    </div>
  </button>
  );
};
const CategoriesPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast(); // Import useToast
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("categories");

  useEffect(() => {
    setPageTitle(t("Категории"));
  }, [setPageTitle, t]);

  // Use useApi for fetching the categories list
  const {
    data: categories,
    isLoading: isLoadingCategories,
    execute: executeFetchCategories,
  } = useApi(fetchCategoriesApi, {
    offlineDataKey: "categories",
  });

  const [activeCategoryType, setActiveCategoryType] =
    useState<CategoryTabType>("expense");
  const filteredCategories =
    categories?.filter((category) => category.type === activeCategoryType) || [];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed executeFetchCategories to prevent infinite loop

  const navigate = useNavigate();

  const handleAddCategory = () => {
    navigate("/categories/new");
  };

  const handleEditCategory = (id: string) => {
    navigate(`/categories/edit/${id}`);
  };

  const closeMobilePanel = React.useCallback(() => {
    setShouldCloseMobilePanel(true);
  }, []);

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

      const nextCategory = filteredCategories.find(
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
        showToast(t("Категория успешно удалена."), "success");
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Удалить категорию"),
      message: t("Вы уверены, что хотите удалить категорию \"{1}\"? Связанные платежи останутся без категории.", categoryName),
    });
  };

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <h1 className="sr-only">{t("Категории")}</h1>
        <PageHeader
          breadcrumbs={[{ label: t("Категории") }]}
          title={
            <HeaderViewMenu
              ariaLabel={t("Тип категории")}
              options={categoryTabOptions.map((option) => ({
                ...option,
                label: t(option.label),
              }))}
              value={activeCategoryType}
              onChange={setActiveCategoryType}
            />
          }
          titleAddon={
            <span className="ml-1 text-sm tabular-nums text-gray-400 dark:text-gray-500">
              {filteredCategories.length}
            </span>
          }
          primaryAction={{
            label: t("Добавить категорию"),
            onClick: handleAddCategory,
          }}
        />

        <>
          {/* Desktop Table View */}
          <div className="hidden md:block px-6 pt-5">
            <Panel bodyClassName="overflow-x-auto">
              <CategoriesTable
                data={filteredCategories}
                isLoading={isLoadingCategories}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            </Panel>
          </div>
          {/* Mobile Card View */}
          {!isLoadingCategories && (
            <div
              ref={mobileListRef}
              onClick={handleMobileListClick}
              className="block md:hidden space-y-2 px-3 py-3"
            >
              {filteredCategories.map((category) => {
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
        confirmText={t("Да, удалить")}
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
