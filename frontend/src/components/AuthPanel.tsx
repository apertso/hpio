import type { ReactElement, ReactNode } from "react";
import { isTauriMobile } from "../utils/platform";
import LanguageSelect from "./LanguageSelect";
import { ThemeSwitcher } from "./ThemeSwitcher";

export default function AuthPanel({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="public-auth mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 sm:px-0 sm:py-12">
      {isTauriMobile() && (
        <div className="mb-6 flex items-center justify-end gap-2">
          <LanguageSelect compact />
          <ThemeSwitcher />
        </div>
      )}
      <section aria-labelledby="auth-title" className="card-base public-card my-auto p-4 sm:p-8">
        {children}
      </section>
    </div>
  );
}
