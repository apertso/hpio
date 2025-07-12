import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import PaymentForm from "../components/PaymentForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import FormBlock from "../components/FormBlock";

const PaymentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSuccess = () => {
    // After success, navigate back to the dashboard or payments list
    navigate("/dashboard");
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={handleCancel}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
          aria-label="Назад"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold ml-4 text-gray-900 dark:text-white">
          {id ? "Редактировать платеж" : "Добавить платеж"}
        </h2>
      </div>

      <FormBlock>
        <PaymentForm
          paymentId={id}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </FormBlock>
    </div>
  );
};

export default PaymentEditPage;
