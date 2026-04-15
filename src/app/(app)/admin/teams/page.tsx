"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { TeamTable } from "@/components/admin/TeamTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { teamsApi } from "@/lib/api-client";
import type { TeamDto } from "@/types";

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teamsApi.list();
      setTeams(res.data);
    } catch {
      setError("Takımlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Takım Yönetimi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Takım ekleyin, düzenleyin veya silin. Kullanıcılar kayıt olurken bu listeden takım seçer.
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : (
        <Card title={`Takımlar (${teams.length})`}>
          <TeamTable teams={teams} onRefresh={load} />
        </Card>
      )}
    </div>
  );
}
