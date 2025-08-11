// frontend/src/components/CategoriesTable.tsx
import React from "react";
import Table, { TableColumn } from "./Table";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BuiltinIcon } from "../utils/builtinIcons";

// Define the Category interface for this component
interface Category {
  id: string;
  name: string;
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
  const columns: TableColumn<Category>[] = [
    {
      id: "icon",
      header: "Иконка",
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
      header: "Название",
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100",
      cell: (category) => <>{category.name}</>,
    },
  ];

  return (
    <Table
      data={data}
      columns={columns}
      getRowKey={(category) => category.id}
      isLoading={isLoading}
      emptyMessage="Нет категорий."
      rowActions={(category) => [
        {
          label: "Редактировать",
          onClick: () => onEdit(category.id),
          icon: <PencilIcon className="h-4 w-4" />,
        },
        {
          label: "Удалить",
          onClick: () => onDelete(category.id, category.name),
          icon: <TrashIcon className="h-4 w-4" />,
        },
      ]}
    />
  );
};

export default CategoriesTable;
