import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
});

type CategoryFormInputs = z.infer<typeof categoryFormSchema>;

const CategoryEditPage: React.FC = () => {
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
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      axiosInstance
        .get(`/categories/${id}`)
        .then((res) => {
          setValue("name", res.data.name);
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
      reset({ name: "" });
    }
  }, [id, isEditMode, setValue, reset]);

  // Устанавливаем заголовок страницы для мобильного заголовка
  useEffect(() => {
    const headerText = isEditMode
      ? "Редактировать категорию"
      : "Новая категория";
    setPageTitle(headerText);
  }, [isEditMode, setPageTitle]);

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
      <div className="max-w-4xl mx-auto">
        {/* Title and back button shown only on desktop - on mobile it's in the header */}
        <div className="hidden md:flex items-center mb-6">
          <Link
            to="/categories"
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
            aria-label="Назад к категориям"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h2 className="text-xl md:text-2xl font-bold ml-4 text-gray-900 dark:text-white">
            {isEditMode ? "Редактировать категорию" : "Новая категория"}
          </h2>
        </div>

        <FormBlock className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
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
                      className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6"
                      role="alert"
                    >
                      <span className="block sm:inline">{formError}</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <TextInputField
                      label="Название категории"
                      inputId="category-name"
                      error={errors.name?.message}
                      required
                      type="text"
                      placeholder="Например, Продукты"
                      disabled={combinedIsLoading}
                      {...register("name")}
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
                      label="Отмена"
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label="Сохранить"
                    />
                  </div>
                  <div className="flex flex-col md:hidden mt-6 space-y-3">
                    <Button
                      variant="primary"
                      size="large"
                      type="submit"
                      loading={combinedIsLoading}
                      disabled={combinedIsLoading}
                      label="Сохранить"
                      className="w-full"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/categories")}
                      disabled={combinedIsLoading}
                      label="Отмена"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="hidden md:flex justify-center items-center">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuARbik3smEtZAY9taVN-GM0G4mQVtI9TiBbn0ERw51lZXj_8R67ommVEgxBIuik_1tih20DA-CJquH9AKMLWeheqtEoUo33JjYd0ypQaNpjhX7eVyC5FxhbTauSLK051Aj0jbB60mZynnR_YVqZCndgUQ23pVHaFMcMfytqzfwV1oEkVLXifcZSvokGJD8T2BaXoJwhzUftDpQd2TZdg3pIumXwPnMhYXNsvzwNSGd56T-VgLhB__PXIZTKAylgNH470smmE5TnkJ9w"
                    alt="A sketch-style illustration of a person organizing items on a shelf, symbolizing categorization."
                    className="h-auto w-full max-w-sm rounded-lg object-cover shadow-lg"
                  />
                </div>
              </div>
            </form>
          )}
        </FormBlock>
      </div>
    </>
  );
};

export default CategoryEditPage;
