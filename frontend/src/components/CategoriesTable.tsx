import { useLanguage } from "../context/LanguageContext";
import React from "react";
import Table, { TableColumn } from "./Table";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BuiltinIcon } from "../utils/builtinIcons";
import { localizedCategoryName } from "../utils/categoryLabel";

// Define the Category interface for this component
interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  builtinIconName?: BuiltinIcon | null;
}

interface CategoriesTableProps {
  data: Category[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const CategoriesTable: React.FC<CategoriesTableProps> = ({
  data,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const thBaseClassName =
    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
  const columns: TableColumn<Category>[] = [
    {
      id: "icon",
      header: t("Иконка"),
      thClassName: `${thBaseClassName} w-20`,
      cell: (category) => (
        <PaymentIconDisplay
          payment={{
            id: category.id,
            builtinIconName: category.builtinIconName,
          }}
          sizeClass="h-6 w-6"
        />
      ),
    },
    {
      id: "name",
      header: t("Название"),
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate",
      cell: (category) => <>{localizedCategoryName(category, language)}</>,
    },
  ];

  return (
    <Table
      data={data}
      columns={columns}
      getRowKey={(category) => category.id}
      isLoading={isLoading}
      emptyMessage={t("Нет категорий.")}
      rowActions={(category) => [
        {
          label: t("Редактировать"),
          onClick: () => onEdit(category.id),
          icon: <PencilIcon className="h-4 w-4" />,
        },
        {
          label: t("Удалить"),
          onClick: () =>
            onDelete(category.id, localizedCategoryName(category, language)),
          icon: <TrashIcon className="h-4 w-4" />,
        },
      ]}
    />
  );
};

export default CategoriesTable;
