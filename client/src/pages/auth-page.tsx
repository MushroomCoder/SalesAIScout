import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "sdr">("admin");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { user, sdrGoogleAuthMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "sdr" && user.status === "approved") {
        navigate("/sdr");
      }
    }
  }, [user, navigate]);

  // Simulate Google sign-in handler (in a real app, this would use firebase or another auth provider)
  const handleGoogleSignIn = () => {
    // For demonstration, create a mock Google auth response
    // In a real implementation, this would use Google OAuth
    sdrGoogleAuthMutation.mutate({
      googleId: `google-${Date.now()}`,
      email: `sdr-${Date.now()}@example.com`,
      name: `SDR User ${Math.floor(Math.random() * 1000)}`
    });
  };

  if (user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AuthLayout
        title="AI-SDR Platform"
        subtitle="AI-powered Sales Development Representative Platform"
        showTabs={true}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "admin" ? (
          <div>
            <Tabs defaultValue={authMode} onValueChange={(v) => setAuthMode(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-neutral-700 mb-4">Sign in with your Google account to continue</p>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2" 
                onClick={handleGoogleSignIn}
                disabled={sdrGoogleAuthMutation.isPending}
              >
                <FcGoogle className="h-5 w-5" />
                {sdrGoogleAuthMutation.isPending ? "Signing in..." : "Sign in with Google"}
              </Button>
            </div>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-neutral-500">New user?</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Alert>
                  <AlertDescription className="text-center text-sm text-neutral-600">
                    Contact your administrator to request access.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        )}
      </AuthLayout>
    </div>
  );
}
