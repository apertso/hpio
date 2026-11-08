import { useLanguage } from "../context/LanguageContext";
import React from "react";
import Modal from "./Modal";
import MobilePanel from "./MobilePanel";

interface AdvancedFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({
  isOpen,
  onClose,
  children,
  title = "Расширенные фильтры",
}) => {
  const { t } = useLanguage();
  return (
    <>
      {/* Desktop Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t(title)}
        showCloseButton={false}
        className="hidden md:flex"
      >
        {children}
      </Modal>

      {/* Mobile Panel */}
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title={t(title)}
      >
        {children}
      </MobilePanel>
    </>
  );
};

export default AdvancedFiltersPanel;
