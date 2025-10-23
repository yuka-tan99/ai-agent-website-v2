import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BecomeFamousLogo } from "./BecomeFamousLogo";

interface ResetPasswordPageProps {
  isLoading?: boolean;
  onSubmit: (newPassword: string) => Promise<void> | void;
  onCancel: () => void;
}

export function ResetPasswordPage({
  isLoading = false,
  onSubmit,
  onCancel,
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(password);
      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/20 to-pink-50/30 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(6)].map((_, index) => (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [0.9, 1.2, 0.9],
            }}
            transition={{
              duration: 3.5 + Math.random() * 1.5,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "#B481C0" }} />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white/70 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/40"
        >
          <div className="flex items-center justify-center mb-10">
            <BecomeFamousLogo size="md" />
          </div>

          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 text-2xl font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, #9E5DAB 0%, #B481C0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Reset your password
            </motion.h1>
            <p className="text-muted-foreground">
              Enter a new password to secure your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Lock className="w-4 h-4" style={{ color: "#9E5DAB" }} />
                New password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting || isLoading || success}
                className="h-12 rounded-2xl bg-[#EBF3FC]"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Lock className="w-4 h-4" style={{ color: "#9E5DAB" }} />
                Confirm password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting || isLoading || success}
                className="h-12 rounded-2xl bg-[#EBF3FC]"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-100/70 rounded-xl px-4 py-3">
                Password updated! Please sign in with your new password.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                className="w-full sm:w-1/2 h-12 rounded-2xl"
              >
                Back to sign in
              </Button>
              <Button
                type="submit"
                disabled={submitting || isLoading || success}
                className="w-full sm:w-1/2 h-12 rounded-2xl shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: "#9E5DAB" }}
              >
                {submitting || isLoading ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
