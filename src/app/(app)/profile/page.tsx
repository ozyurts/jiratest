"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { authApi, teamsApi } from "@/lib/api-client";
import type { MeDto, TeamDto } from "@/types";

export default function ProfilePage() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([authApi.me(), teamsApi.list()])
      .then(([meRes, teamsRes]) => {
        setMe(meRes.data);
        setTeams(teamsRes.data);
        setSelectedTeamId(meRes.data.teamId ?? "");
      })
      .catch(() => setError("Profil bilgileri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const hasChange = selectedTeamId !== (me?.teamId ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await authApi.updateProfile({ teamId: selectedTeamId || null });
      setMe(res.data);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
        <p className="text-sm text-gray-500 mt-1">Takım bilgilerinizi güncelleyebilirsiniz.</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <Card><div className="py-12"><LoadingSpinner /></div></Card>
      ) : me ? (
        <>
          <Card title="Hesap Bilgileri">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ad Soyad</span>
                <span className="font-medium text-gray-900">{me.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">E-posta</span>
                <span className="font-medium text-gray-900">{me.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rol</span>
                <span className="font-medium text-gray-900">
                  {me.role === "ADMIN" ? "Admin" : "Kullanıcı"}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Takım">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Takımınızı değiştirdiğinizde, bu haftadan itibaren efor girişleriniz yeni takımınıza dahil edilir.
                Geçmiş haftaların verileri değişmez.
              </p>

              <div>
                <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-1">
                  Takım
                </label>
                <select
                  id="teamId"
                  value={selectedTeamId}
                  onChange={(e) => { setSelectedTeamId(e.target.value); setSavedAt(null); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Takım seçin —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {savedAt && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800"
                >
                  <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Takım bilgisi güncellendi.
                  {me.teamName && (
                    <span className="font-medium"> Yeni takım: {me.teamName}</span>
                  )}
                </div>
              )}

              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!hasChange}
                className="w-full"
              >
                Takımı Güncelle
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
