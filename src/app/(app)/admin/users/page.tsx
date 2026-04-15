"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserTable } from "@/components/admin/UserTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { usersApi, teamsApi, authApi } from "@/lib/api-client";
import type { UserDto, TeamDto, MeDto } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [me, setMe] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, teamsRes, meRes] = await Promise.all([
        usersApi.list({ page, pageSize: PAGE_SIZE, teamId: selectedTeamId || undefined }),
        teamsApi.list(),
        authApi.me(),
      ]);
      setUsers(usersRes.data);
      setTotalPages(usersRes.pagination.totalPages);
      setTeams(teamsRes.data);
      setMe(meRes.data);
    } catch {
      setError("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedTeamId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kullanıcı rollerini ve takım atamalarını yönetin.
          </p>
        </div>

        <select
          value={selectedTeamId}
          onChange={(e) => { setSelectedTeamId(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto"
        >
          <option value="">Tüm Takımlar</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : (
        <Card title={`Kullanıcılar (${users.length})`}>
          <UserTable
            users={users}
            teams={teams}
            currentUserId={me?.id ?? ""}
            onRefresh={load}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Önceki
              </Button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki →
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
