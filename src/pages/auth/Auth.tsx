
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";

type AuthMode = "login" | "register" | "forgot" | "recovery";

type AuthProps = {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
};

export default function Auth({
  recoveryMode = false,
  onRecoveryComplete,
}: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(
    recoveryMode ? "recovery" : "login"
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recoveryMode) {
      setMode("recovery");
      setError("");
      setMessage("");
      setPassword("");
      setConfirmPassword("");
    }
  }, [recoveryMode]);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  function changeMode(newMode: AuthMode) {
    setMode(newMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (loading) return;

    // PASSWORD RECOVERY
    if (mode === "recovery") {
      if (password.length < 8) {
        setError("Your password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }

      setLoading(true);

      try {
        const { error: updateError } =
          await supabase.auth.updateUser({ password });

        if (updateError) throw updateError;

        setMessage(
          "Your password has been updated successfully. You can now sign in using your new password."
        );

        setPassword("");
        setConfirmPassword("");

        await supabase.auth.signOut();

        setMode("login");
        setEmail("");

        onRecoveryComplete?.();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to update your password. Please try again."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // EMAIL VALIDATION
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (mode !== "forgot" && !password) {
      setError("Please enter your password.");
      return;
    }

    // REGISTRATION VALIDATION
    if (mode === "register") {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (password.length < 8) {
        setError("Your password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      // REGISTER
      if (mode === "register") {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
              emailRedirectTo: window.location.origin,
            },
          });

        if (signUpError) throw signUpError;

        if (data.session) {
          setMessage(
            "Your account has been created successfully. You can now use your account."
          );
        } else {
          setMessage(
            "Registration successful! Please check your email to confirm your account before signing in."
          );

          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setFullName("");
        }
      }

      // LOGIN - SHARED BY ADMIN AND USER
      else if (mode === "login") {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) throw loginError;

        // Verify the authenticated user's profile.
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", data.user.id)
            .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();

          throw new Error(
            "Unable to verify your account information. Please contact the administrator."
          );
        }

        // Reject inactive accounts.
        if (profile.is_active !== true) {
          await supabase.auth.signOut();

          throw new Error(
            "Your account has been deactivated. Please contact the administrator for assistance."
          );
        }

        // Only approved roles are allowed.
        const actualRole = profile.role?.toLowerCase();

        if (actualRole !== "admin" && actualRole !== "user") {
          await supabase.auth.signOut();

          throw new Error(
            "Your account has an invalid role. Please contact the administrator."
          );
        }

        // App.tsx will load the correct dashboard based on this role.
        setMessage("Login successful. Loading your dashboard...");
      }

      // FORGOT PASSWORD
      else if (mode === "forgot") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo: window.location.origin,
            }
          );

        if (resetError) throw resetError;

        setMessage(
          "If an account exists for this email, a password reset link will be sent."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isRecovery = mode === "recovery";

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Track Mo, Pake ko!
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isRegister
              ? "Create your account to start tracking your expenses."
              : isForgot
                ? "Enter your email to receive a password reset link."
                : isRecovery
                  ? "Create a new password for your account."
                  : "Welcome back! Sign in to manage your money."}
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          {!isRecovery && (
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          {!isForgot && (
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {isRecovery ? "New password" : "Password"}
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister || isRecovery
                      ? "new-password"
                      : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegister || isRecovery
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  minLength={
                    isRegister || isRecovery ? 8 : undefined
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 transition hover:text-emerald-600"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>
          )}

          {(isRegister || isRecovery) && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Confirm {isRecovery ? "new " : ""}password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Re-enter your password"
                  minLength={8}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 transition hover:text-emerald-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>
          )}

          {!isRegister && !isForgot && !isRecovery && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : isForgot
                  ? "Send reset link"
                  : isRecovery
                    ? "Update Password"
                    : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isForgot || isRecovery ? (
            <button
              type="button"
              onClick={async () => {
                if (isRecovery) {
                  await supabase.auth.signOut();
                  onRecoveryComplete?.();
                }

                changeMode("login");
              }}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Back to sign in
            </button>
          ) : isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="font-semibold text-emerald-700 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => changeMode("register")}
                className="font-semibold text-emerald-700 hover:underline"
              >
                Create one
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
