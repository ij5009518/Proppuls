import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.success) {
        setSubmitResult({
          success: true,
          message: response.message,
        });
        form.reset();
      } else {
        setSubmitResult({
          success: false,
          message: response.message || "Failed to send reset email",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setSubmitResult({
        success: false,
        message: "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a link to reset your password
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
                </AlertDescription>
              </Alert>
            )}

            {!submitResult?.success && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    {...form.register("email")}
                    className={form.formState.errors.email ? "border-red-500" : ""}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-center space-x-1 text-sm">
              <ArrowLeft className="h-4 w-4" />
              <Link to="/login">
                <a className="text-blue-600 hover:text-blue-800 hover:underline">
                  Back to Login
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}