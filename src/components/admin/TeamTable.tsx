"use client";

import { useState } from "react";
import type { TeamDto } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { teamsApi } from "@/lib/api-client";

interface TeamTableProps {
  teams: TeamDto[];
  onRefresh: () => void;
}

export function TeamTable({ teams, onRefresh }: TeamTableProps) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await teamsApi.create({ name: newName.trim() });
      setNewName("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await teamsApi.update(id, { name: editName.trim() });
      setEditId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" takımını silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    setError(null);
    try {
      await teamsApi.delete(id);
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

      {/* Add new team */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni takım adı..."
          className="flex-1"
          maxLength={100}
        />
        <Button type="submit" loading={loading} disabled={!newName.trim()}>
          Takım Ekle
        </Button>
      </form>

      {/* Teams list */}
      {teams.length === 0 ? (
        <p className="text-center py-6 text-sm text-gray-500">Henüz takım eklenmemiş.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between py-3">
              {editId === team.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    maxLength={100}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleUpdate(team.id)} loading={loading}>
                    Kaydet
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    İptal
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-900">{team.name}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setEditId(team.id); setEditName(team.name); }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(team.id, team.name)}
                    >
                      Sil
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
