"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { EffortSlider } from "@/components/effort/EffortSlider";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { effortsApi } from "@/lib/api-client";
import { getWeekStart, getISOWeekNumber } from "@/lib/week";
import type { EffortEntryDto } from "@/types";

export default function EntryPage() {
  const [existing, setExisting] = useState<EffortEntryDto | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekStart = getWeekStart();
  const weekKey = weekStart.toISOString().slice(0, 10);
  const weekNumber = getISOWeekNumber(weekStart);

  // initialLoad=true → spinner göster; false → slider'ı sökmeden arka planda güncelle
  const loadCurrentWeek = useCallback(async (initialLoad = false) => {
    if (initialLoad) setInitialLoading(true);
    try {
      const res = await effortsApi.myHistory({ page: 1, pageSize: 4 });
      const entry = res.data.find((e) => e.weekStartDate === weekKey) ?? null;
      setExisting(entry);
    } catch {
      setError("Mevcut efor verisi yüklenemedi.");
    } finally {
      if (initialLoad) setInitialLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    loadCurrentWeek(true);
  }, [loadCurrentWeek]);

  const handleSaved = useCallback(() => {
    // Arka planda yenile — slider unmount olmaz, başarı mesajı görünür kalır
    loadCurrentWeek(false);
  }, [loadCurrentWeek]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Haftalık Efor Girişi</h1>
          <span className="rounded-full bg-primary-100 text-primary-700 px-3 py-1 text-sm font-semibold">
            Hafta {weekNumber}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Bu haftaki iş gücünüzü üç kategori arasında dağıtın. Toplam %100 olmalıdır.
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {initialLoading ? (
        <Card>
          <div className="py-12">
            <LoadingSpinner />
          </div>
        </Card>
      ) : (
        <Card title={existing ? "Bu Haftaki Girişinizi Güncelleyin" : "Bu Hafta İçin Efor Girin"}>
          <EffortSlider
            weekStartDate={weekStart}
            weekNumber={weekNumber}
            initialValues={
              existing
                ? {
                    past: existing.pastPercentage,
                    today: existing.todayPercentage,
                    future: existing.futurePercentage,
                  }
                : undefined
            }
            onSaved={handleSaved}
          />
        </Card>
      )}

      {/* Category legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
          <p className="font-semibold text-amber-700 mb-1">Geçmişin İşleri</p>
          <p className="text-amber-600 text-xs">Geçmiş problemlerin çözümü, toplantı katılımı, eski işler için araştırma</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="font-semibold text-blue-700 mb-1">Bugünün İşleri</p>
          <p className="text-blue-600 text-xs">Backlog görevleri, projeler, mevcut feature geliştirmeleri</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="font-semibold text-emerald-700 mb-1">Yarının İşleri</p>
          <p className="text-emerald-600 text-xs">İnisiyatifler, kişisel gelişim, geleceğe yatırım aktiviteleri</p>
        </div>
      </div>
    </div>
  );
}
