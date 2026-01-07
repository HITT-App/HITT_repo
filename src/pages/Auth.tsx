import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { HIITLogo } from "@/components/HIITLogo";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthView = "signin" | "signup" | "forgot-password" | "reset-sent";

const Auth = () => {
  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (password.length === 0) return { level: 0, label: "", color: "" };
    if (password.length < 6) return { level: 1, label: "Weak", color: "bg-destructive" };
    if (password.length < 8) return { level: 2, label: "Fair", color: "bg-yellow-500" };
    if (password.length < 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 3, label: "Good", color: "bg-blue-500" };
    }
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { level: 4, label: "Strong!", color: "bg-green-500" };
    }
    return { level: 2, label: "Fair", color: "bg-yellow-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    try {
      setApiError(null);
      if (view === "signin") {
        loginSchema.parse({ email, password });
      } else if (view === "signup") {
        signupSchema.parse({ email, password, displayName, confirmPassword });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError(null);

    try {
      if (view === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setApiError("Incorrect email or password.");
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        }
      } else if (view === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("already registered")) {
            setApiError("This email is already registered. Try signing in instead.");
          } else {
            setApiError(error.message);
          }
        } else {
          toast({
            title: "Account created!",
            description: "Welcome to HIIT Fitness. Let's get started!",
          });
        }
      } else if (view === "forgot-password") {
        // TODO: Implement password reset
        setView("reset-sent");
      }
    } catch (error) {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSignIn = () => (
    <>
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4 animate-fade-up">
          <HIITLogo size="xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
          HIIT
        </h1>
        <p className="text-muted-foreground text-sm mt-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          Sign in to access your intelligent fitness.
        </p>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 animate-fade-up">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <Label htmlFor="password" className="text-foreground font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="keepSignedIn" 
              checked={keepSignedIn}
              onCheckedChange={(checked) => setKeepSignedIn(checked as boolean)}
            />
            <Label htmlFor="keepSignedIn" className="text-sm text-muted-foreground cursor-pointer">
              Keep me signed in
            </Label>
          </div>
          <button
            type="button"
            onClick={() => setView("forgot-password")}
            className="text-sm text-primary hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Google Sign In */}
      <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.35s" }}>
        <Button variant="outline" className="w-full btn-google">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign In With Google
        </Button>
      </div>

      {/* Sign Up Link */}
      <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.4s" }}>
        <p className="text-muted-foreground text-sm">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => {
              setView("signup");
              setErrors({});
              setApiError(null);
            }}
            className="text-primary hover:underline font-medium"
          >
            Sign Up
          </button>
        </p>
      </div>
    </>
  );

  const renderSignUp = () => (
    <>
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4 animate-fade-up">
          <HIITLogo size="xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
          HIIT
        </h1>
        <p className="text-muted-foreground text-sm mt-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          Sign up to get intelligent fitness today.
        </p>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 animate-fade-up">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <Label htmlFor="password" className="text-foreground font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {password && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      level <= passwordStrength.level ? passwordStrength.color : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Password strength: {passwordStrength.label}
              </span>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Label htmlFor="confirmPassword" className="text-foreground font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            <>
              Sign Up
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.35s" }}>
        <p className="text-muted-foreground text-sm">
          I already have an{" "}
          <button
            type="button"
            onClick={() => {
              setView("signin");
              setErrors({});
              setApiError(null);
            }}
            className="text-primary hover:underline font-medium"
          >
            account
          </button>
        </p>
      </div>
    </>
  );

  const renderForgotPassword = () => (
    <>
      {/* Back Button */}
      <button
        onClick={() => setView("signin")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Forgot Password
        </h1>
        <p className="text-muted-foreground text-sm">
          Please enter your email address to reset your password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
        </div>

        <Button
          type="submit"
          className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <>
              Send Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <p className="text-muted-foreground text-sm">
          Don't remember your email?{" "}
          <span className="text-primary">Contact us at help@hiit.ai</span>
        </p>
      </div>
    </>
  );

  const renderResetSent = () => (
    <>
      {/* Back Button */}
      <button
        onClick={() => setView("signin")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Content */}
      <div className="text-center">
        <div className="text-6xl mb-6 animate-scale-in">✉️</div>
        <h1 className="text-2xl font-bold text-foreground mb-2 animate-fade-up">
          Password Reset Sent!
        </h1>
        <p className="text-muted-foreground text-sm mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Great! We've sent you an email containing password recovery link.
        </p>

        <Button
          onClick={() => window.open("mailto:", "_blank")}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          Open my email
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-muted-foreground text-sm">
            Still don't get any email?{" "}
            <span className="text-primary">Contact us at help@hiit.ai</span>
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {view === "signin" && renderSignIn()}
        {view === "signup" && renderSignUp()}
        {view === "forgot-password" && renderForgotPassword()}
        {view === "reset-sent" && renderResetSent()}
      </div>
    </div>
  );
};

export default Auth;