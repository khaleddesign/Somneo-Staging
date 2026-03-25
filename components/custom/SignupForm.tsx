"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface SignupFormProps {
  token: string;
  email: string;
  fullName?: string | null;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
  return { score: 4, label: "Strong", color: "bg-green-500" };
}

export default function SignupForm({
  token,
  email,
  fullName,
}: SignupFormProps) {
  const [name, setName] = useState(fullName ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      return setError("Password too short (minimum 8 characters)");
    }
    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Error creating account");
        setLoading(false);
        return;
      }

      router.push(data.redirect);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Input */}
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-gray-700 font-medium font-heading"
        >
          Full name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            required
            disabled={loading}
            className="pl-10 bg-white border border-gray-200 rounded-lg focus-visible:ring-teal/20 focus-visible:border-teal"
          />
        </div>
      </div>

      {/* Email Input (Read-only) */}
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-gray-700 font-medium font-heading"
        >
          Email
        </Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-gray-100 border border-gray-200 rounded-lg text-gray-600"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-gray-700 font-medium font-heading"
        >
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="pl-10 pr-10 bg-white border border-gray-200 rounded-lg focus-visible:ring-teal/20 focus-visible:border-teal"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {password && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.color} transition-all duration-300`}
                  style={{ width: `${passwordStrength.score * 25}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {passwordStrength.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Use at least 8 characters, including uppercase, lowercase and
              numbers
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-2">
        <Label
          htmlFor="confirm"
          className="text-gray-700 font-medium font-heading"
        >
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            className="pl-10 pr-10 bg-white border border-gray-200 rounded-lg focus-visible:ring-teal/20 focus-visible:border-teal"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirm ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-teal hover:bg-teal/90 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Création...
          </>
        ) : (
          "Create my account"
        )}
      </Button>
    </form>
  );
}
