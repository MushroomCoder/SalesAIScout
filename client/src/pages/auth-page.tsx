import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { AlertCircle, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "sdr">("admin");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { user, sdrGoogleAuthMutation } = useAuth();
  const [, navigate] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Clear auth error when switching tabs
  useEffect(() => {
    setAuthError(null);
  }, [activeTab]);

  // Handle error messages from the API
  useEffect(() => {
    if (sdrGoogleAuthMutation.error) {
      const errorMessage = sdrGoogleAuthMutation.error.message || "Authentication failed";
      if (errorMessage.includes("pending")) {
        setAuthError("Your account is pending approval from an administrator. Please check back later.");
      } else if (errorMessage.includes("rejected")) {
        setAuthError("Your account request has been rejected. Please contact an administrator for assistance.");
      } else {
        setAuthError(errorMessage);
      }
    }
  }, [sdrGoogleAuthMutation.error]);

  // State for Google sign-in form
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  
  // Simulate Google sign-in handler (in a real app, this would use firebase or another auth provider)
  const handleGoogleSignIn = () => {
    // Reset any previous errors
    setAuthError(null);
    
    // Show the form instead of auto-generating credentials
    setShowGoogleForm(true);
  };
  
  // Handler for Google form submission
  const handleGoogleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!googleEmail || !googleName) {
      setAuthError("Please provide both name and email");
      return;
    }
    
    // For demonstration, create a mock Google auth response with user-provided data
    // In a real implementation, this would use Google OAuth
    sdrGoogleAuthMutation.mutate({
      googleId: `google-${googleEmail}`,
      email: googleEmail,
      name: googleName
    });
    
    // Reset form
    setShowGoogleForm(false);
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
            {authError && (
              <Alert className="mb-4 border-orange-200 bg-orange-100">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-700">Authentication Status</AlertTitle>
                <AlertDescription className="text-orange-700">{authError}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center">
              <p className="text-sm text-neutral-700 mb-4">Sign in with your Google account to continue</p>
              
              {!showGoogleForm ? (
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={handleGoogleSignIn}
                  disabled={sdrGoogleAuthMutation.isPending}
                >
                  <FcGoogle className="h-5 w-5" />
                  <span>Sign in with Google</span>
                </Button>
              ) : (
                <form onSubmit={handleGoogleFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="googleName" className="text-sm font-medium text-gray-700 text-left block">
                      Your Name
                    </label>
                    <input
                      id="googleName"
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="googleEmail" className="text-sm font-medium text-gray-700 text-left block">
                      Your Email
                    </label>
                    <input
                      id="googleEmail"
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="john.doe@example.com"
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={sdrGoogleAuthMutation.isPending}
                    >
                      {sdrGoogleAuthMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>Continue</span>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGoogleForm(false)}
                      disabled={sdrGoogleAuthMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
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
                    {sdrGoogleAuthMutation.isSuccess && !user 
                      ? "Your account has been created and is pending admin approval."
                      : "Click the Google sign-in button to create a new SDR account. Admin approval is required."}
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
