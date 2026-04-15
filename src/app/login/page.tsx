"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { authApi } from "@/lib/api-client";
import { loginSchema } from "@/lib/validations/auth";
import type { z } from "zod";

type FormErrors = Partial<Record<"email" | "password" | "general", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.errors.forEach((e) => {
        const key = e.path[0] as keyof FormErrors;
        errs[key] = e.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.login({ email, password });
      router.push("/entry");
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Giriş yapılamadı." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-2xl shadow-lg mb-4">
            W
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Workload Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Hesabınıza giriş yapın</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <ErrorAlert message={errors.general} onDismiss={() => setErrors((e) => ({ ...e, general: undefined }))} />

            <Input
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="ornek@firma.com"
              autoComplete="email"
              required
            />

            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Giriş Yap
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="text-primary-600 hover:underline font-medium">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
