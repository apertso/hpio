import React from "react";

interface SettingsSectionProps {
  children: React.ReactNode;
  className?: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ children, className = "" }) => {
  return <div className={`w-full ${className}`}>{children}</div>;
};

export default SettingsSection;
