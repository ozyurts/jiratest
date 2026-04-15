"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MemberSummaryTable } from "@/components/dashboard/MemberSummaryTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { effortsApi, teamsApi } from "@/lib/api-client";
import type { DashboardDto, TeamDto, WeeklyAverageDto } from "@/types";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [trends, setTrends] = useState<WeeklyAverageDto[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, teamsRes] = await Promise.all([
        effortsApi.dashboard({ teamId: selectedTeamId || undefined, weeks }),
        teamsApi.list(),
      ]);
      setDashboard(dashRes.data);
      setTeams(teamsRes.data);
      setTrends(dashRes.data.teamAverages);
    } catch {
      setError("Dashboard verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, weeks]);

  const loadTrends = useCallback(async () => {
    try {
      const res = await effortsApi.trends({
        userId: selectedUserId || undefined,
        teamId: !selectedUserId && selectedTeamId ? selectedTeamId : undefined,
        weeks,
      });
      setTrends(res.data);
    } catch {}
  }, [selectedUserId, selectedTeamId, weeks]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading) loadTrends(); }, [selectedUserId]);

  const teamAverages = dashboard?.teamAverages ?? [];
  const latestWeek = teamAverages[teamAverages.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Ekip iş gücü dağılım analizi</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedTeamId}
            onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedUserId(""); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tüm Takımlar</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value, 10))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={4}>Son 4 Hafta</option>
            <option value={8}>Son 8 Hafta</option>
            <option value={12}>Son 12 Hafta</option>
            <option value={26}>Son 26 Hafta</option>
            <option value={52}>Son 52 Hafta</option>
          </select>

          <Button variant="secondary" size="sm" onClick={load}>
            Yenile
          </Button>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Summary stat cards */}
          {latestWeek && latestWeek.entryCount > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-5 text-center">
                <p className="text-3xl font-bold text-amber-600">%{latestWeek.pastAvg}</p>
                <p className="text-sm text-amber-700 mt-1 font-medium">Geçmişin İşleri</p>
                <p className="text-xs text-amber-500 mt-0.5">Son hafta ortalama</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">%{latestWeek.todayAvg}</p>
                <p className="text-sm text-blue-700 mt-1 font-medium">Bugünün İşleri</p>
                <p className="text-xs text-blue-500 mt-0.5">Son hafta ortalama</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600">%{latestWeek.futureAvg}</p>
                <p className="text-sm text-emerald-700 mt-1 font-medium">Yarının İşleri</p>
                <p className="text-xs text-emerald-500 mt-0.5">Son hafta ortalama</p>
              </div>
            </div>
          )}

          {/* Trend chart */}
          <Card title={selectedUserId
            ? `${dashboard?.memberSummaries.find((m) => m.userId === selectedUserId)?.fullName} — Haftalık Trend`
            : selectedTeamId
            ? `${teams.find((t) => t.id === selectedTeamId)?.name} — Haftalık Trend`
            : "Ekip Geneli Haftalık Trend"
          }>
            {trends.some((t) => t.entryCount > 0) ? (
              <TrendChart data={trends} />
            ) : (
              <p className="text-center py-8 text-sm text-gray-500">Bu dönem için veri bulunmuyor.</p>
            )}
          </Card>

          {/* Member summary */}
          <Card title="Üye Özeti (Son Giriş)">
            <p className="text-xs text-gray-400 mb-4">
              Bir üyeye tıklayarak o kişinin trend grafiğini görüntüleyebilirsiniz.
            </p>
            <MemberSummaryTable
              members={dashboard?.memberSummaries ?? []}
              onSelectUser={(id) => setSelectedUserId((prev) => prev === id ? "" : id)}
              selectedUserId={selectedUserId}
            />
          </Card>
        </>
      )}
    </div>
  );
}
