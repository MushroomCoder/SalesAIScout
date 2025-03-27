import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTabs?: boolean;
  activeTab?: "admin" | "sdr";
  onTabChange?: (tab: "admin" | "sdr") => void;
};

export function AuthLayout({
  children,
  title,
  subtitle,
  showTabs = false,
  activeTab = "admin",
  onTabChange
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>}
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {showTabs && (
            <div className="mb-6 pb-6 border-b border-neutral-200">
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => onTabChange?.("admin")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium",
                    activeTab === "admin"
                      ? "text-primary-700 border-b-2 border-primary-700"
                      : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange?.("sdr")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium",
                    activeTab === "sdr"
                      ? "text-primary-700 border-b-2 border-primary-700"
                      : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  SDR Login
                </button>
              </div>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
}
