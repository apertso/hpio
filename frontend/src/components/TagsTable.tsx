import React from "react";
import Table, { TableColumn } from "./Table";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Tag {
  id: string;
  name: string;
}

interface TagsTableProps {
  data: Tag[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const TagsTable: React.FC<TagsTableProps> = ({
  data,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const thBaseClassName =
    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
  const columns: TableColumn<Tag>[] = [
    {
      id: "name",
      header: "Название",
      thClassName: thBaseClassName,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate",
      cell: (tag) => <>{tag.name}</>,
    },
  ];

  return (
    <Table
      data={data}
      columns={columns}
      getRowKey={(tag) => tag.id}
      isLoading={isLoading}
      emptyMessage="Нет тегов."
      rowActions={(tag) => [
        {
          label: "Редактировать",
          onClick: () => onEdit(tag.id),
          icon: <PencilIcon className="h-4 w-4" />,
        },
        {
          label: "Удалить",
          onClick: () => onDelete(tag.id, tag.name),
          icon: <TrashIcon className="h-4 w-4" />,
        },
      ]}
    />
  );
};

export default TagsTable;
