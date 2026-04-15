"use client";

import { useState } from "react";
import type { UserDto, TeamDto } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { usersApi } from "@/lib/api-client";

interface UserTableProps {
  users: UserDto[];
  teams: TeamDto[];
  currentUserId: string;
  onRefresh: () => void;
}

export function UserTable({ users, teams, currentUserId, onRefresh }: UserTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"USER" | "ADMIN">("USER");
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function startEdit(user: UserDto) {
    setEditId(user.id);
    setEditRole(user.role);
    setEditTeamId(user.teamId);
  }

  async function saveEdit(id: string) {
    setLoading(true);
    setError(null);
    try {
      await usersApi.update(id, { role: editRole, teamId: editTeamId });
      setEditId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.delete(id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="pb-3 pr-4">Ad Soyad</th>
              <th className="pb-3 pr-4">E-posta</th>
              <th className="pb-3 pr-4">Takım</th>
              <th className="pb-3 pr-4">Rol</th>
              <th className="pb-3">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium text-gray-900">{user.fullName}</td>
                <td className="py-3 pr-4 text-gray-500">{user.email}</td>
                <td className="py-3 pr-4">
                  {editId === user.id ? (
                    <select
                      value={editTeamId ?? ""}
                      onChange={(e) => setEditTeamId(e.target.value || null)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Takım yok —</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-600">{user.teamName ?? "—"}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {editId === user.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as "USER" | "ADMIN")}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="USER">Kullanıcı</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <Badge variant={user.role === "ADMIN" ? "admin" : "user"}>
                      {user.role === "ADMIN" ? "Admin" : "Kullanıcı"}
                    </Badge>
                  )}
                </td>
                <td className="py-3">
                  {editId === user.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(user.id)} loading={loading}>
                        Kaydet
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        İptal
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(user)}>
                        Düzenle
                      </Button>
                      {user.id !== currentUserId && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(user.id, user.fullName)}
                        >
                          Sil
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
