import React from "react";

export interface MobileAction {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  handler: () => void;
  /** Разрушающее действие (удаление) — выделяется красным */
  tone?: "default" | "destructive";
}

interface MobileActionBarProps {
  actions: MobileAction[];
  /** Вызывается после любого действия (обычно — закрыть панель) */
  onAfterSelect?: () => void;
}

/**
 * Список действий в нижней панели на мобильных: строки одинаковой высоты,
 * иконка и подпись выровнены по левому краю, как в нативном меню.
 */
const MobileActionBar: React.FC<MobileActionBarProps> = ({
  actions,
  onAfterSelect,
}) => (
  <div role="menu" className="flex flex-col py-1">
    {actions.map((action) => {
      const isDestructive = action.tone === "destructive";
      return (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          onClick={() => {
            action.handler();
            onAfterSelect?.();
          }}
          className={`flex h-12 w-full min-w-0 items-center gap-3.5 rounded-lg px-2 text-left text-[15px] transition-colors cursor-pointer active:bg-gray-100 dark:active:bg-white/[0.06] ${
            isDestructive
              ? "text-red-600 dark:text-red-400"
              : "text-gray-800 dark:text-gray-100"
          }`}
        >
          <action.icon
            strokeWidth={1.75}
            className={`size-5 shrink-0 ${
              isDestructive
                ? "text-red-500 dark:text-red-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
            aria-hidden="true"
          />
          <span className="truncate">{action.label}</span>
        </button>
      );
    })}
  </div>
);

export default MobileActionBar;
