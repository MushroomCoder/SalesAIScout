import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, LoginUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginUser>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  sdrGoogleAuthMutation: UseMutationResult<User, Error, { googleId: string; email: string; name: string }>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Handle initial routing based on user role
  useEffect(() => {
    if (!isLoading && user) {
      // If user is logged in and on the auth page, redirect to appropriate dashboard
      if (location === "/auth") {
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "sdr" && user.status === "approved") {
          navigate("/sdr");
        }
      }
    }
  }, [user, isLoading, location, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "sdr" && user.status === "approved") {
        navigate("/sdr");
      }
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        toast({
          title: "Registration successful",
          description: "Your account is pending approval from an administrator.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sdrGoogleAuthMutation = useMutation({
    mutationFn: async (data: { googleId: string; email: string; name: string }) => {
      const res = await apiRequest("POST", "/api/sdr/auth", data);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      if (user.status === "approved") {
        navigate("/sdr");
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.username}!`,
        });
      } else {
        toast({
          title: "Registration successful",
          description: "Your account is pending approval from an administrator.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      navigate("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        registerMutation,
        sdrGoogleAuthMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
