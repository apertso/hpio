import React from "react";
import {
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

interface BottomNavigationBarProps {
  activeTab: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
}

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 safe-area-bottom">
      <div className="flex justify-around items-center">
        <button
          type="button"
          onClick={() => onTabChange("login")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors text-center flex flex-col items-center ${
            activeTab === "login"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 mb-1" />
          <span>Вход</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("register")}
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors text-center flex flex-col items-center ${
            activeTab === "register"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          <UserPlusIcon className="w-6 h-6 mb-1" />
          <span>Регистрация</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigationBar;
