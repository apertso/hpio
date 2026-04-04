import React, { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import {
  PencilIcon as PencilSolidIcon,
  PlusIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../components/Button";
import { InformationIcon } from "../components/InformationIcon";
import useApi from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { Tooltip } from "../components";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";
import Modal from "../components/Modal";
import { TextInputField } from "../components/Input";
import getErrorMessage from "../utils/getErrorMessage";
import Spinner from "../components/Spinner";

interface Tag {
  id: string;
  name: string;
}

const fetchTagsApi = async (): Promise<Tag[]> => {
  const res = await axiosInstance.get("/tags");
  return res.data;
};

const tagFormSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

const MobileActionsOverlay: React.FC<{
  tag: Tag | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}> = ({ tag, onClose, onEdit, onDelete }) => {
  if (!tag) return null;

  const actions = [
    {
      label: "Редактировать",
      icon: PencilSolidIcon,
      handler: () => onEdit(tag.id),
    },
    {
      label: "Удалить",
      icon: TrashSolidIcon,
      handler: () => onDelete(tag.id, tag.name),
    },
  ];

  return (
    <MobilePanel
      isOpen={!!tag}
      onClose={onClose}
      title=""
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
            className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24 cursor-pointer"
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
};

const TagsPage: React.FC = () => {
  const { showToast } = useToast();
  const { setPageTitle, setHeaderAction } = usePageTitle();
  const metadata = getPageMetadata("tags");

  useEffect(() => {
    setPageTitle("Теги");
  }, [setPageTitle]);

  useEffect(() => {
    setHeaderAction(
      <Tooltip content="Используйте теги, чтобы отмечать похожие платежи. Это упрощает поиск и помогает собирать статистику по отдельным группам платежей.">
        <button className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer">
          <InformationIcon className="h-[16px] w-[16px]" />
        </button>
      </Tooltip>
    );

    return () => setHeaderAction(null);
  }, [setHeaderAction]);

  const {
    data: tags,
    isLoading: isLoadingTags,
    execute: executeFetchTags,
  } = useApi<Tag[]>(fetchTagsApi, {
    offlineDataKey: "tags",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    clearErrors,
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: "" },
    mode: "onChange",
    delayError: 1000,
  });

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTagFormOpen, setIsTagFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagFormError, setTagFormError] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileActionsTag, setMobileActionsTag] = useState<Tag | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    executeFetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateViewport);
    } else {
      mediaQuery.addListener(updateViewport);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateViewport);
      } else {
        mediaQuery.removeListener(updateViewport);
      }
    };
  }, []);
  const openTagForm = React.useCallback(
    (tag: Tag | null): void => {
      setEditingTag(tag);
      setTagFormError(null);
      reset({ name: tag?.name || "" });
      setIsTagFormOpen(true);
    },
    [reset]
  );

  const handleAddTag = (): void => {
    openTagForm(null);
  };

  const handleEditTag = (id: string): void => {
    const targetTag = tags?.find((tag) => tag.id === id) || null;
    if (!targetTag) {
      showToast("Тег не найден.", "error");
      return;
    }
    openTagForm(targetTag);
  };

  const handleTagPress = (tag: Tag): void => {
    if (isMobileViewport) {
      setMobileActionsTag((current) => (current?.id === tag.id ? null : tag));
      return;
    }
    handleEditTag(tag.id);
  };

  const closeMobileActions = (): void => {
    setMobileActionsTag(null);
  };

  useEffect(() => {
    if (!isMobileViewport || !mobileActionsTag) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (chipsRef.current?.contains(target)) {
        return;
      }

      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      setMobileActionsTag(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileViewport, mobileActionsTag]);

  const closeTagForm = (): void => {
    setIsTagFormOpen(false);
    setEditingTag(null);
    setTagFormError(null);
    reset({ name: "" });
  };

  useEffect(() => {
    const handleCreateRequest = (): void => {
      openTagForm(null);
    };
    window.addEventListener("tags:create-request", handleCreateRequest);
    return () => {
      window.removeEventListener("tags:create-request", handleCreateRequest);
    };
  }, [openTagForm]);
  const onConfirmAction = async (): Promise<void> => {
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

  const handleDeleteTag = async (
    tagId: string,
    tagName: string
  ): Promise<void> => {
    const action = async (): Promise<void> => {
      try {
        await axiosInstance.delete(`/tags/${tagId}`);
        executeFetchTags();
        showToast("Тег удален.", "success");
      } catch {
        showToast("Не удалось удалить тег. Попробуйте позже.", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить тег",
      message: `Вы уверены, что хотите удалить тег "${tagName}"? Это действие нельзя отменить.`,
    });
  };

  const onSubmitTagForm: SubmitHandler<TagFormValues> = async (data) => {
    setTagFormError(null);
    try {
      if (editingTag) {
        await axiosInstance.put(`/tags/${editingTag.id}`, data);
        showToast("Тег обновлен.", "success");
      } else {
        await axiosInstance.post("/tags", data);
        showToast("Тег добавлен.", "success");
      }
      await executeFetchTags();
      closeTagForm();
    } catch (error) {
      setTagFormError(getErrorMessage(error));
    }
  };

  const nameRegister = register("name");
  const tagFormTitle = editingTag ? "Редактировать тег" : "Новый тег";
  const tagFormSubmitLabel = editingTag ? "Сохранить" : "Добавить";

  const renderTagForm = (): React.ReactNode => (
    <form onSubmit={handleSubmit(onSubmitTagForm)} noValidate>
      {tagFormError && (
        <div
          className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <span className="block sm:inline">{tagFormError}</span>
        </div>
      )}
      <TextInputField
        label="Название тега"
        inputId="tag-name"
        error={errors.name?.message}
        required
        type="text"
        placeholder="Например, Коммуналка"
        disabled={isSubmitting}
        {...nameRegister}
        onChange={(event) => {
          clearErrors("name");
          nameRegister.onChange(event);
        }}
      />
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          type="button"
          onClick={closeTagForm}
          disabled={isSubmitting}
          label="Отмена"
        />
        <Button
          variant="primary"
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          label={tagFormSubmitLabel}
        />
      </div>
    </form>
  );

  return (
    <>
      <PageMeta {...metadata} />

      <div className="max-w-4xl mx-auto pb-20 dark:text-gray-100">
        <div className="flex justify-between items-center md:mb-6">
          <div className="flex items-center gap-2">
            <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Управление тегами
            </h2>
            <Tooltip content="Используйте теги, чтобы отмечать похожие платежи. Это упрощает поиск и помогает собирать статистику по отдельным группам платежей.">
              <div className="hidden md:block p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer">
                <InformationIcon className="h-[16px] w-[16px]" />
              </div>
            </Tooltip>
          </div>
          <Button
            onClick={handleAddTag}
            label="Добавить тег"
            icon={<PlusIcon className="w-4 h-4" />}
            className="hidden md:inline-flex"
          />
        </div>

        {isLoadingTags ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : tags && tags.length > 0 ? (
          <div ref={chipsRef} className="flex flex-wrap gap-3">
            {tags.map((tag) => {
              const isSelected =
                isMobileViewport && mobileActionsTag?.id === tag.id;
              return (
                <div
                  key={tag.id}
                  className={`flex items-stretch rounded-full border bg-white dark:bg-gray-900 transition-all ${
                    isSelected
                      ? "border-indigo-400 dark:border-indigo-500 shadow-sm"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTagPress(tag)}
                    className="px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                    aria-label={
                      isMobileViewport
                        ? `Открыть действия для тега ${tag.name}`
                        : `Редактировать тег ${tag.name}`
                    }
                  >
                    {tag.name}
                  </button>
                  {!isMobileViewport && (
                    <div className="flex items-center gap-1 self-stretch rounded-r-full bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 px-1">
                      <button
                        type="button"
                        onClick={() => handleEditTag(tag.id)}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
                        aria-label={`Редактировать тег ${tag.name}`}
                      >
                        <PencilSolidIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
                        aria-label={`Удалить тег ${tag.name}`}
                      >
                        <TrashSolidIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Нет тегов.
          </div>
        )}
      </div>
      {isMobileViewport ? (
        <MobilePanel
          isOpen={isTagFormOpen}
          onClose={closeTagForm}
          title={tagFormTitle}
        >
          {renderTagForm()}
        </MobilePanel>
      ) : (
        <Modal
          isOpen={isTagFormOpen}
          onClose={closeTagForm}
          title={tagFormTitle}
        >
          {renderTagForm()}
        </Modal>
      )}
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
        tag={mobileActionsTag}
        onClose={closeMobileActions}
        onEdit={handleEditTag}
        onDelete={handleDeleteTag}
      />
    </>
  );
};

export default TagsPage;
