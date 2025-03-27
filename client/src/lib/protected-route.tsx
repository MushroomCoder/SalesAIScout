import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
  role?: "admin" | "sdr";
};

export function ProtectedRoute({ path, component: Component, role }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user has the required role
  if (role && user.role !== role) {
    // If user is admin but accessing SDR route, redirect to admin dashboard
    if (user.role === "admin" && role === "sdr") {
      return (
        <Route path={path}>
          <Redirect to="/admin" />
        </Route>
      );
    }
    
    // If user is SDR but accessing admin route, redirect to SDR dashboard
    if (user.role === "sdr" && role === "admin") {
      return (
        <Route path={path}>
          <Redirect to="/sdr" />
        </Route>
      );
    }
  }

  // If SDR account is not approved yet, show a message
  if (user.role === "sdr" && user.status !== "approved") {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
            <p className="text-gray-600 mb-6">
              Your account is currently pending approval from an administrator. 
              Please check back later or contact your administrator.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </Route>
    );
  }

  return <Component />;
}
