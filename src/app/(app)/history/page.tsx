"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EffortHistoryTable } from "@/components/effort/EffortHistoryTable";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { effortsApi } from "@/lib/api-client";
import type { EffortEntryDto, WeeklyAverageDto } from "@/types";

export default function HistoryPage() {
  const [entries, setEntries] = useState<EffortEntryDto[]>([]);
  const [trends, setTrends] = useState<WeeklyAverageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 12;

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const [histRes, trendRes] = await Promise.all([
        effortsApi.myHistory({ page: p, pageSize: PAGE_SIZE }),
        effortsApi.trends({ weeks: 12 }),
      ]);
      setEntries(histRes.data);
      setTotalPages(histRes.pagination.totalPages);
      setTrends(trendRes.data);
    } catch {
      setError("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Efor Geçmişim</h1>
        <p className="text-sm text-gray-500 mt-1">Geçmiş haftalara ait efor girişleriniz</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : (
        <>
          {trends.length > 0 && (
            <Card title="Son 12 Hafta Trendi">
              <TrendChart data={trends} />
            </Card>
          )}

          <Card title="Haftalık Girişler">
            <EffortHistoryTable entries={entries} />

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
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
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
        </>
      )}
    </div>
  );
}
