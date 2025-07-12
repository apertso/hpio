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
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";

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
  const isEditMode = !!id;

  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

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

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    setFormError(null);
    try {
      if (isEditMode) {
        await axiosInstance.put(`/categories/${id}`, data);
        logger.info(`Category updated: ${id}`);
      } else {
        await axiosInstance.post("/categories", data);
        logger.info("Category created");
      }
      navigate("/categories");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const combinedIsLoading = isSubmitting || isLoading;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Link
          to="/categories"
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
          aria-label="Назад к категориям"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </Link>
        <h2 className="text-2xl font-bold ml-4 text-gray-900 dark:text-white">
          {isEditMode ? "Редактировать категорию" : "Новая категория"}
        </h2>
      </div>

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
                    className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-6"
                    role="alert"
                  >
                    <span className="block sm:inline">{formError}</span>
                  </div>
                )}
                <div className="mb-6">
                  <Input
                    id="category-name"
                    label="Название категории"
                    type="text"
                    placeholder="Например, Продукты"
                    {...register("name")}
                    disabled={combinedIsLoading}
                    error={errors.name?.message}
                  />
                </div>

                <div className="flex items-center justify-start space-x-4 mt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/categories")}
                    className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500"
                    disabled={combinedIsLoading}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-28"
                    disabled={combinedIsLoading}
                  >
                    {combinedIsLoading ? <Spinner size="sm" /> : "Сохранить"}
                  </button>
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
  );
};

export default CategoryEditPage;
