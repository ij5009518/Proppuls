import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Extract token from URL
  const urlParams = new URLSearchParams(search);
  const resetToken = urlParams.get("token");

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!resetToken) {
        setTokenValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-reset-token/${resetToken}`);
        const result = await response.json();
        if (result.valid) {
          setTokenValid(true);
          setUserEmail(result.email);
        } else {
          setTokenValid(false);
        }
      } catch (error) {
        console.error("Token validation error:", error);
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [resetToken]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitResult({
          success: true,
          message: result.message,
        });
        form.reset();
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation("/login");
        }, 3000);
      } else {
        setSubmitResult({
          success: false,
          message: result.message || "Failed to reset password",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setSubmitResult({
        success: false,
        message: "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center text-red-800">
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-center">
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Link to="/forgot-password">
                  <Button className="w-full">
                    Request New Reset Link
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <KeyRound className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your new password for {userEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitResult && (
              <Alert className={submitResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {submitResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={submitResult.success ? "text-green-800" : "text-red-800"}>
                  {submitResult.message}
                  {submitResult.success && (
                    <span className="block mt-2 text-sm">
                      Redirecting to login page in 3 seconds...
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!submitResult?.success && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      {...form.register("password")}
                      className={form.formState.errors.password ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      {...form.register("confirmPassword")}
                      className={form.formState.errors.confirmPassword ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
            )}

            {!submitResult?.success && (
              <div className="flex items-center justify-center space-x-1 text-sm">
                <ArrowLeft className="h-4 w-4" />
                <Link to="/login">
                  <a className="text-blue-600 hover:text-blue-800 hover:underline">
                    Back to Login
                  </a>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}