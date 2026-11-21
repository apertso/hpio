import { useLanguage } from "../context/LanguageContext";
import { PageContent, PageHeader } from "../components/layout/Page";
import React, { useEffect, useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import {
  PencilIcon as PencilSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../components/Button";
import useApi from "../hooks/useApi";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
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
  const { t } = useLanguage();
  if (!tag) return null;

  const actions = [
    {
      label: t("Редактировать"),
      icon: PencilOutlineIcon,
      handler: () => onEdit(tag.id),
    },
    {
      label: t("Удалить"),
      icon: TrashOutlineIcon,
      tone: "destructive" as const,
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
      <MobileActionBar actions={actions} onAfterSelect={onClose} />
    </MobilePanel>
  );
};

const TagsPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("tags");

  useEffect(() => {
    setPageTitle(t("Теги"));
  }, [setPageTitle, t]);

  const {
    data: tags,
    isLoading: isLoadingTags,
    execute: executeFetchTags,
  } = useApi(fetchTagsApi, {
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
      showToast(t("Тег не найден."), "error");
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
        showToast(t("Тег удален."), "success");
      } catch {
        showToast(t("Не удалось удалить тег. Попробуйте позже."), "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Удалить тег"),
      message: t("Вы уверены, что хотите удалить тег \"{1}\"? Это действие нельзя отменить.", tagName),
    });
  };

  const onSubmitTagForm: SubmitHandler<TagFormValues> = async (data) => {
    setTagFormError(null);
    try {
      if (editingTag) {
        await axiosInstance.put(`/tags/${editingTag.id}`, data);
        showToast(t("Тег обновлен."), "success");
      } else {
        await axiosInstance.post("/tags", data);
        showToast(t("Тег добавлен."), "success");
      }
      await executeFetchTags();
      closeTagForm();
    } catch (error) {
      setTagFormError(getErrorMessage(error));
    }
  };

  const nameRegister = register("name");
  const tagFormTitle = editingTag ? t("Редактировать тег") : t("Новый тег");
  const tagFormSubmitLabel = editingTag ? t("Сохранить") : t("Добавить");

  const renderTagForm = (): React.ReactNode => (
    <form onSubmit={handleSubmit(onSubmitTagForm)} noValidate>
      {tagFormError && (
        <div
          className="ui-alert-error mb-6"
          role="alert"
        >
          <span className="block sm:inline">{tagFormError}</span>
        </div>
      )}
      <TextInputField
        label={t("Название тега")}
        inputId="tag-name"
        error={errors.name?.message}
        required
        type="text"
        placeholder={t("Например, Коммуналка")}
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
          label={t("Отмена")}
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

      <div className="dark:text-gray-100">
        <PageHeader
          title={t("Теги")}
          primaryAction={{ label: t("Добавить тег"), onClick: handleAddTag }}
        />
        <PageContent>

        {isLoadingTags ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : tags && tags.length > 0 ? (
          <div ref={chipsRef} className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected =
                isMobileViewport && mobileActionsTag?.id === tag.id;
              return (
                <div
                  key={tag.id}
                  className={`group/tag flex items-stretch h-7 rounded-md border bg-[var(--ui-surface)] shadow-sm transition-colors ${
                    isSelected
                      ? "border-indigo-400 dark:border-indigo-500"
                      : "border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTagPress(tag)}
                    className="px-2 text-sm text-gray-800 dark:text-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                    aria-label={
                      isMobileViewport
                        ? t("Открыть действия для тега {1}", tag.name)
                        : t("Редактировать тег {1}", tag.name)
                    }
                  >
                    {tag.name}
                  </button>
                  {!isMobileViewport && (
                    <div className="flex items-center self-stretch border-l border-[var(--ui-border)] px-0.5">
                      <button
                        type="button"
                        onClick={() => handleEditTag(tag.id)}
                        className="p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors cursor-pointer"
                        aria-label={t("Редактировать тег {1}", tag.name)}
                      >
                        <PencilSolidIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors cursor-pointer"
                        aria-label={t("Удалить тег {1}", tag.name)}
                      >
                        <TrashSolidIcon className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("Нет тегов.")}
          </div>
        )}
        </PageContent>
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
        confirmText={t("Да, удалить")}
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
