import { useLanguage } from "../context/LanguageContext";
import { PageHeader, PageContent } from "../components/layout/Page";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import Spinner from "../components/Spinner";
import getErrorMessage from "../utils/getErrorMessage";
import { TextInputField } from "../components/Input";
import FormBlock from "../components/FormBlock";
import IconSelector from "../components/IconSelector";
import { BuiltinIcon } from "../utils/builtinIcons";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import { Button } from "../components/Button";

const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
  nameEn: z
    .string()
    .min(1, "Английское название обязательно")
    .max(255, "Название слишком длинное"),
});

type CategoryFormInputs = z.infer<typeof categoryFormSchema>;

const CategoryEditPage: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const isEditMode = !!id;
  const metadata = getPageMetadata("categories"); // Используем метаданные категорий для страниц редактирования

  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [selectedIcon, setSelectedIcon] = useState<BuiltinIcon | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<CategoryFormInputs>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", nameEn: "" },
  });

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      axiosInstance
        .get(`/categories/${id}`)
        .then((res) => {
          setValue("name", res.data.name);
          setValue("nameEn", res.data.nameEn || "");
          setSelectedIcon(res.data.builtinIconName || null);
        })
        .catch((error) => {
          logger.error(`Failed to fetch category ${id}`, error);
          setFormError(getErrorMessage(error));
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      reset({ name: "", nameEn: "" });
    }
  }, [id, isEditMode, setValue, reset]);

  // Устанавливаем заголовок страницы для мобильного заголовка
  useEffect(() => {
    const headerText = isEditMode
      ? t("Редактировать категорию")
      : t("Новая категория");
    setPageTitle(headerText);
  }, [isEditMode, setPageTitle, t]);

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    setFormError(null);
    const payload = {
      ...data,
      builtinIconName: selectedIcon,
    };
    try {
      if (isEditMode) {
        await axiosInstance.put(`/categories/${id}`, payload);
        logger.info(`Category updated: ${id}`);
      } else {
        await axiosInstance.post("/categories", payload);
        logger.info("Category created");
      }
      navigate("/categories");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const combinedIsLoading = isSubmitting || isLoading;

  return (
    <>
      <PageMeta {...metadata} />
      <div className="dark:text-gray-100">
        <PageHeader
          breadcrumbs={[{ label: t("Категории"), to: "/categories" }]}
          title={isEditMode ? t("Редактировать категорию") : t("Новая категория")}
        />
        <PageContent width="form">
        <FormBlock>
          {isLoading && isEditMode ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="flex flex-col mt-16">
                  {formError && (
                    <div
                      className="ui-alert-error mb-6"
                      role="alert"
                    >
                      <span className="block sm:inline">{t(formError)}</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <TextInputField
                      label={t("Название на русском")}
                      inputId="category-name"
                      error={errors.name?.message}
                      required
                      type="text"
                      placeholder={t("Например, Продукты")}
                      disabled={combinedIsLoading}
                      {...register("name")}
                    />
                  </div>
                  <div className="mb-6">
                    <TextInputField
                      label={t("Название на английском")}
                      inputId="category-name-en"
                      error={errors.nameEn?.message}
                      required
                      type="text"
                      placeholder={t("Например, Groceries")}
                      disabled={combinedIsLoading}
                      {...register("nameEn")}
                    />
                  </div>
                  <div className="mb-6">
                    <IconSelector
                      selectedIconName={selectedIcon}
                      onIconChange={setSelectedIcon}
                      isFormSubmitting={combinedIsLoading}
                    />
                  </div>

                  <div className="hidden md:flex items-center justify-end space-x-4 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/categories")}
                      disabled={combinedIsLoading}
                      label={t("Отмена")}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label={t("Сохранить")}
                    />
                  </div>
                  <div className="flex flex-col md:hidden mt-6 space-y-3">
                    <Button
                      variant="primary"
                      size="large"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label={t("Сохранить")}
                      className="w-full"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/categories")}
                      disabled={combinedIsLoading}
                      label={t("Отмена")}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="hidden md:flex justify-center items-center">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuARbik3smEtZAY9taVN-GM0G4mQVtI9TiBbn0ERw51lZXj_8R67ommVEgxBIuik_1tih20DA-CJquH9AKMLWeheqtEoUo33JjYd0ypQaNpjhX7eVyC5FxhbTauSLK051Aj0jbB60mZynnR_YVqZCndgUQ23pVHaFMcMfytqzfwV1oEkVLXifcZSvokGJD8T2BaXoJwhzUftDpQd2TZdg3pIumXwPnMhYXNsvzwNSGd56T-VgLhB__PXIZTKAylgNH470smmE5TnkJ9w"
                    alt="A sketch-style illustration of a person organizing items on a shelf, symbolizing categorization."
                    className="h-auto w-full max-w-sm rounded-lg border border-[var(--ui-border)] object-cover"
                  />
                </div>
              </div>
            </form>
          )}
        </FormBlock>
        </PageContent>
      </div>
    </>
  );
};

export default CategoryEditPage;
