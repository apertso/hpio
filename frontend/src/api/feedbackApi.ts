import axiosInstance from "./axiosInstance";

export const submitFeedback = async (
  description: string,
  file?: File | null
) => {
  const formData = new FormData();
  formData.append("description", description);
  if (file) {
    formData.append("attachment", file);
  }

  const response = await axiosInstance.post("/feedback", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data as { id: string };
};
