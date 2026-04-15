"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { authApi, teamsApi } from "@/lib/api-client";
import { registerSchema } from "@/lib/validations/auth";
import type { TeamDto } from "@/types";

type FormErrors = Partial<Record<"email" | "password" | "fullName" | "teamId" | "general", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", teamId: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamDto[]>([]);

  useEffect(() => {
    teamsApi.list().then((res) => setTeams(res.data)).catch(() => {});
  }, []);

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const result = registerSchema.safeParse({
      ...form,
      teamId: form.teamId || null,
    });
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.errors.forEach((e) => {
        const key = e.path[0] as keyof FormErrors;
        if (!errs[key]) errs[key] = e.message;
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
      await authApi.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        teamId: form.teamId || null,
      });
      router.push("/entry");
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Kayıt işlemi başarısız." });
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
          <p className="text-sm text-gray-500 mt-1">Yeni hesap oluşturun</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <ErrorAlert message={errors.general} onDismiss={() => setErrors((e) => ({ ...e, general: undefined }))} />

            <Input
              label="Ad Soyad"
              type="text"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              error={errors.fullName}
              placeholder="Ahmet Yılmaz"
              autoComplete="name"
              required
            />

            <Input
              label="E-posta"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              error={errors.email}
              placeholder="ornek@firma.com"
              autoComplete="email"
              required
            />

            <Input
              label="Şifre"
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              error={errors.password}
              placeholder="En az 8 karakter"
              hint="Büyük harf, küçük harf ve rakam içermelidir."
              autoComplete="new-password"
              required
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="teamId" className="text-sm font-medium text-gray-700">
                Takım <span className="text-gray-400">(isteğe bağlı)</span>
              </label>
              <select
                id="teamId"
                value={form.teamId}
                onChange={(e) => setField("teamId", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Takım seçin —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.teamId && <p className="text-xs text-red-600">{errors.teamId}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Kayıt Ol
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
