"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { effortsApi } from "@/lib/api-client";
import { getWeekStart, formatWeekLabel, weekStartToISODate } from "@/lib/week";

interface EffortValues {
  past: number;
  today: number;
  future: number;
}

interface EffortSliderProps {
  initialValues?: EffortValues;
  weekStartDate?: Date;
  weekNumber?: number;
  onSaved?: () => void;
}

const CATEGORIES = [
  {
    key: "past" as const,
    label: "Geçmişin İşleri",
    description: "Geçmiş problemlerin çözümü, toplantılara katılım, araştırmalar",
    color: "bg-amber-400",
    trackColor: "accent-amber-500",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    key: "today" as const,
    label: "Bugünün İşleri",
    description: "Backlog görevleri, projeler, yeni feature geliştirmeleri",
    color: "bg-blue-500",
    trackColor: "accent-blue-500",
    lightBg: "bg-blue-50",
    border: "border-blue-200",
    textColor: "text-blue-700",
  },
  {
    key: "future" as const,
    label: "Yarının İşleri",
    description: "İnisiyatifler, kişisel gelişim, geleceğe yatırım aktiviteleri",
    color: "bg-emerald-500",
    trackColor: "accent-emerald-500",
    lightBg: "bg-emerald-50",
    border: "border-emerald-200",
    textColor: "text-emerald-700",
  },
];

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function EffortSlider({ initialValues, weekStartDate, weekNumber, onSaved }: EffortSliderProps) {
  const weekStart = weekStartDate ?? getWeekStart();
  const weekLabel = formatWeekLabel(weekStart);

  const [values, setValues] = useState<EffortValues>(
    initialValues ?? { past: 33, today: 34, future: 33 }
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // initialValues prop değiştiğinde (arka plan reload) değerleri güncelle —
  // yalnızca kullanıcı aktif olarak düzenleme yapmıyorsa
  useEffect(() => {
    if (initialValues && !saving) {
      setValues(initialValues);
    }
  }, [initialValues?.past, initialValues?.today, initialValues?.future]);

  const total = values.past + values.today + values.future;
  const isValid = total === 100;

  const handleSliderChange = useCallback(
    (changed: keyof EffortValues, newValue: number) => {
      setValues((prev) => {
        const clamped = clamp(newValue);
        const others: (keyof EffortValues)[] = (
          ["past", "today", "future"] as (keyof EffortValues)[]
        ).filter((k) => k !== changed);

        const remaining = 100 - clamped;
        const otherSum = prev[others[0]] + prev[others[1]];

        let a: number, b: number;
        if (otherSum === 0) {
          a = Math.floor(remaining / 2);
          b = remaining - a;
        } else {
          const ratio = prev[others[0]] / otherSum;
          a = clamp(Math.round(remaining * ratio));
          b = clamp(remaining - a);
        }

        return { ...prev, [changed]: clamped, [others[0]]: a, [others[1]]: b };
      });
      setSavedAt(null);
    },
    []
  );

  const handleInputChange = useCallback(
    (key: keyof EffortValues, raw: string) => {
      const v = parseInt(raw, 10);
      if (!isNaN(v)) handleSliderChange(key, v);
    },
    [handleSliderChange]
  );

  async function handleSave() {
    if (!isValid) return;
    setError(null);
    setSaving(true);
    try {
      await effortsApi.save({
        weekStartDate: weekStartToISODate(weekStart),
        pastPercentage: values.past,
        todayPercentage: values.today,
        futurePercentage: values.future,
        notes: notes.trim() || null,
      });
      setSavedAt(new Date());
      // Arka plan yenilemeyi geciktir — başarı mesajı görünür kalsın
      setTimeout(() => onSaved?.(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  const savedTimeLabel = savedAt
    ? savedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Hafta</p>
            {weekNumber && (
              <span className="rounded-full bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 text-xs font-semibold">
                Hafta {weekNumber}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900">{weekLabel}</p>
        </div>
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            isValid
              ? "bg-emerald-100 text-emerald-700"
              : total > 100
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          Toplam: %{total}
        </div>
      </div>

      {!isValid && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2">
          Üç kategori toplamı tam olarak %100 olmalıdır. Şu an: %{total}
        </p>
      )}

      {/* Sliders */}
      <div className="space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className={`rounded-xl border p-4 ${cat.lightBg} ${cat.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className={`font-medium text-sm ${cat.textColor}`}>{cat.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={values[cat.key]}
                  onChange={(e) => handleInputChange(cat.key, e.target.value)}
                  className={`w-16 rounded-lg border px-2 py-1 text-center text-sm font-bold ${cat.textColor} bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1`}
                  aria-label={`${cat.label} yüzdesi`}
                />
                <span className={`text-sm font-medium ${cat.textColor}`}>%</span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              value={values[cat.key]}
              onChange={(e) => handleSliderChange(cat.key, parseInt(e.target.value, 10))}
              className={`w-full h-2 rounded-full cursor-pointer ${cat.trackColor}`}
              aria-label={`${cat.label} kaydırıcı`}
            />

            {/* Visual bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${cat.color}`}
                style={{ width: `${values[cat.key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Visual proportion bar */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">Dağılım Önizlemesi</p>
        <div className="flex h-6 w-full rounded-full overflow-hidden">
          <div
            className="bg-amber-400 transition-all duration-200 flex items-center justify-center"
            style={{ width: `${values.past}%` }}
          >
            {values.past >= 10 && (
              <span className="text-xs font-bold text-white">%{values.past}</span>
            )}
          </div>
          <div
            className="bg-blue-500 transition-all duration-200 flex items-center justify-center"
            style={{ width: `${values.today}%` }}
          >
            {values.today >= 10 && (
              <span className="text-xs font-bold text-white">%{values.today}</span>
            )}
          </div>
          <div
            className="bg-emerald-500 transition-all duration-200 flex items-center justify-center"
            style={{ width: `${values.future}%` }}
          >
            {values.future >= 10 && (
              <span className="text-xs font-bold text-white">%{values.future}</span>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Geçmiş</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Bugün</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />Yarın</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Not (isteğe bağlı)
        </label>
        <textarea
          id="notes"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu hafta ile ilgili ek notlarınız..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-xs text-gray-400 text-right">{notes.length}/500</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Başarı mesajı — kalıcı, slider'ı sökmeden gösterilir */}
      {savedAt && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800"
        >
          <svg className="h-5 w-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Efor girişi başarıyla kaydedildi.{" "}
            <span className="text-emerald-600 font-medium">{savedTimeLabel}</span> itibarıyla güncel.
          </span>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={!isValid}
        loading={saving}
        size="lg"
        className="w-full"
      >
        {savedAt ? "Güncelle" : "Kaydet"}
      </Button>
    </div>
  );
}
