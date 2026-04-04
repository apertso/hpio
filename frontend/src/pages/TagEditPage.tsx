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
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import { Button } from "../components/Button";

const tagFormSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
});

type TagFormInputs = z.infer<typeof tagFormSchema>;

const TagEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const isEditMode = !!id;
  const metadata = getPageMetadata("tags");

  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    clearErrors,
  } = useForm<TagFormInputs>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: "" },
    mode: "onChange",
    delayError: 1000,
  });

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      axiosInstance
        .get(`/tags/${id}`)
        .then((res) => {
          setValue("name", res.data.name);
        })
        .catch((error) => {
          logger.error(`Failed to fetch tag ${id}`, error);
          setFormError(getErrorMessage(error));
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      reset({ name: "" });
    }
  }, [id, isEditMode, setValue, reset]);

  useEffect(() => {
    const headerText = isEditMode ? "Редактировать тег" : "Новый тег";
    setPageTitle(headerText);
  }, [isEditMode, setPageTitle]);

  const onSubmit: SubmitHandler<TagFormInputs> = async (data) => {
    setFormError(null);
    try {
      if (isEditMode) {
        await axiosInstance.put(`/tags/${id}`, data);
        logger.info(`Tag updated: ${id}`);
      } else {
        await axiosInstance.post("/tags", data);
        logger.info("Tag created");
      }
      navigate("/tags");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const combinedIsLoading = isSubmitting || isLoading;
  const nameRegister = register("name");

  return (
    <>
      <PageMeta {...metadata} />
      <div className="max-w-4xl mx-auto">
        <div className="hidden md:flex items-center mb-6">
          <Link
            to="/tags"
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:opacity-80 transition-all text-gray-800 dark:text-gray-200 cursor-pointer"
            aria-label="Назад к тегам"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h2 className="text-xl md:text-2xl font-bold ml-4 text-gray-900 dark:text-white">
            {isEditMode ? "Редактировать тег" : "Новый тег"}
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
                      label="Название тега"
                      inputId="tag-name"
                      error={errors.name?.message}
                      required
                      type="text"
                      placeholder="Например, отпуск"
                      disabled={combinedIsLoading}
                      {...nameRegister}
                      onChange={(event) => {
                        clearErrors("name");
                        nameRegister.onChange(event);
                      }}
                    />
                  </div>

                  <div className="hidden md:flex items-center justify-end space-x-4 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/tags")}
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
                      onClick={() => navigate("/tags")}
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

export default TagEditPage;
