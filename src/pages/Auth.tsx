import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Analytics } from "@/lib/analytics";
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

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  confirmPassword: z.string(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthView = "signin" | "signup" | "forgot-password" | "reset-sent" | "update-password";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") as AuthView || "signin";
  
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Apple sign-in is native-iOS-only for now (web needs a Services ID + secret
  // that isn't configured). Gate the button so it never appears where it can't work.
  const showAppleSignIn = Capacitor.getPlatform() === "ios";

  useEffect(() => {
    // Handle update-password view from URL param
    const viewParam = searchParams.get("view");
    if (viewParam === "update-password") {
      setView("update-password");
    }
  }, [searchParams]);

  useEffect(() => {
    // Only redirect if not on update-password view (user might be logged in during password update)
    if (user && view !== "update-password") {
      navigate("/");
    }
  }, [user, navigate, view]);

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
        signupSchema.parse({ email, password, displayName, confirmPassword, acceptedTerms });
      } else if (view === "update-password") {
        updatePasswordSchema.parse({ password, confirmPassword });
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
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setApiError("Please confirm your email address before signing in. Check your inbox.");
          } else {
            setApiError("Incorrect email or password.");
          }
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
          Analytics.userSignedUp('email');
          // If onAuthStateChange fires immediately (email confirmation off),
          // the useEffect watching user navigates away automatically.
          // If email confirmation is required, show the right message and stop the spinner.
          toast({
            title: "Account created!",
            description: "Check your email to confirm your account, then sign in.",
          });
          setIsLoading(false);
        }
      } else if (view === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) {
          setApiError(error.message);
        } else {
          setView("reset-sent");
        }
      } else if (view === "update-password") {
        const { error } = await updatePassword(password);
        if (error) {
          setApiError(error.message);
        } else {
          toast({
            title: "Password updated!",
            description: "Your password has been successfully changed.",
          });
          navigate("/");
        }
      }
    } catch (error) {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setApiError(null);

    const { error } = await signInWithGoogle();

    setIsLoading(false);

    if (error && (error as Error).message !== 'USER_CANCELLED') {
      setApiError((error as Error).message);
    }
    // Success: navigation is handled by the useEffect watching user above.
    // Web: OAuth redirects the page — nothing more to do here.
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setApiError(null);

    const { error } = await signInWithApple();

    setIsLoading(false);

    if (error && (error as Error).message !== 'USER_CANCELLED') {
      setApiError((error as Error).message);
    }
    // Success: navigation is handled by the useEffect watching user above.
  };

  const AppleButton = ({ label }: { label: string }) => (
    <Button
      variant="outline"
      className="w-full bg-white text-black hover:bg-neutral-100 hover:text-black border border-black/10 shadow-sm font-medium flex items-center justify-center gap-2"
      onClick={handleAppleSignIn}
      disabled={isLoading}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
      {label}
    </Button>
  );

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
        <Button 
          variant="outline" 
          className="w-full btn-google"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign In With Google
        </Button>
      </div>

      {/* Apple Sign In (native iOS only) */}
      {showAppleSignIn && (
        <div className="mt-3 animate-fade-up" style={{ animationDelay: "0.38s" }}>
          <AppleButton label="Sign in with Apple" />
        </div>
      )}

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
        {/* Display Name */}
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <Label htmlFor="displayName" className="text-foreground font-medium">
            Your Name
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter your name..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="auth-input"
            enterKeyHint="next"
            onKeyDown={(e) => e.key === 'Enter' && emailRef.current?.focus()}
          />
          {errors.displayName && (
            <p className="text-xs text-destructive">{errors.displayName}</p>
          )}
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address
          </Label>
          <Input
            ref={emailRef}
            id="email"
            type="email"
            placeholder="Enter your email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            enterKeyHint="next"
            onKeyDown={(e) => e.key === 'Enter' && passwordRef.current?.focus()}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Label htmlFor="password" className="text-foreground font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pr-10"
              enterKeyHint="next"
              onKeyDown={(e) => e.key === 'Enter' && confirmPasswordRef.current?.focus()}
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

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.35s" }}>
          <Label htmlFor="confirmPassword" className="text-foreground font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              ref={confirmPasswordRef}
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input pr-10"
              enterKeyHint="done"
              onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
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

        {/* Terms of Service Checkbox */}
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-start gap-2">
            <Checkbox 
              id="acceptedTerms" 
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor="acceptedTerms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
              I agree to the{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {errors.acceptedTerms && (
            <p className="text-xs text-destructive">{errors.acceptedTerms}</p>
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

      {/* Google Sign Up */}
      <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.45s" }}>
        <Button 
          variant="outline" 
          className="w-full btn-google"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign Up With Google
        </Button>
      </div>

      {/* Apple Sign Up (native iOS only) */}
      {showAppleSignIn && (
        <div className="mt-3 animate-fade-up" style={{ animationDelay: "0.48s" }}>
          <AppleButton label="Sign up with Apple" />
        </div>
      )}

      {/* Sign In Link */}
      <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.5s" }}>
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

      {/* Error Banner */}
      {apiError && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 animate-fade-up">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

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
              Send Reset Link
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <p className="text-muted-foreground text-sm">
          Don't remember your email?{" "}
          <a href="mailto:hiit.co.uk@gmail.com" className="text-primary hover:underline">Contact us at hiit.co.uk@gmail.com</a>
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
            <a href="mailto:hiit.co.uk@gmail.com" className="text-primary hover:underline">Contact us at hiit.co.uk@gmail.com</a>
          </p>
        </div>
      </div>
    </>
  );

  const renderUpdatePassword = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4 animate-fade-up">
          <HIITLogo size="xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Set New Password
        </h1>
        <p className="text-muted-foreground text-sm mt-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          Enter your new password below.
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
          <Label htmlFor="password" className="text-foreground font-medium">
            New Password
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

        <div className="space-y-2 animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <Label htmlFor="confirmPassword" className="text-foreground font-medium">
            Confirm New Password
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
              Updating...
            </span>
          ) : (
            <>
              Update Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </>
  );

  return (
    // `min-h-[100dvh]` respects iOS's dynamic viewport (address bar +
    // home indicator). overflow-y-auto stays as a graceful fallback for
    // shorter phones / keyboard-open state — but with the top/bottom
    // padding tightened to the safe-area only, the form fits within
    // one screen on modern devices, so no visible scroll appears.
    <div className="min-h-[100dvh] bg-background overflow-y-auto flex">
      <div
        className="w-full max-w-sm mx-auto px-6 py-8 my-auto"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 24px)',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        {view === "signin" && renderSignIn()}
        {view === "signup" && renderSignUp()}
        {view === "forgot-password" && renderForgotPassword()}
        {view === "reset-sent" && renderResetSent()}
        {view === "update-password" && renderUpdatePassword()}
      </div>
    </div>
  );
};

export default Auth;