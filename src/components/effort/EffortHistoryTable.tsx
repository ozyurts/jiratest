"use client";

import type { EffortEntryDto } from "@/types";
import { formatWeekLabel } from "@/lib/week";
import { Badge } from "@/components/ui/Badge";

interface EffortHistoryTableProps {
  entries: EffortEntryDto[];
  showUser?: boolean;
}

export function EffortHistoryTable({ entries, showUser = false }: EffortHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center py-8 text-sm text-gray-500">
        Henüz efor girişi bulunmuyor.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="pb-3 pr-4">Hafta</th>
            {showUser && <th className="pb-3 pr-4">Kişi</th>}
            {showUser && <th className="pb-3 pr-4">Takım</th>}
            <th className="pb-3 pr-4 text-amber-600">Geçmiş</th>
            <th className="pb-3 pr-4 text-blue-600">Bugün</th>
            <th className="pb-3 pr-4 text-emerald-600">Yarın</th>
            <th className="pb-3">Dağılım</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 text-gray-900 font-medium whitespace-nowrap">
                {formatWeekLabel(new Date(entry.weekStartDate + "T00:00:00Z"))}
              </td>
              {showUser && (
                <td className="py-3 pr-4 text-gray-700">{entry.userFullName}</td>
              )}
              {showUser && (
                <td className="py-3 pr-4 text-gray-500">{entry.teamName ?? "—"}</td>
              )}
              <td className="py-3 pr-4">
                <Badge variant="past">%{entry.pastPercentage}</Badge>
              </td>
              <td className="py-3 pr-4">
                <Badge variant="today">%{entry.todayPercentage}</Badge>
              </td>
              <td className="py-3 pr-4">
                <Badge variant="future">%{entry.futurePercentage}</Badge>
              </td>
              <td className="py-3 min-w-[120px]">
                <div className="flex h-3 w-28 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400"
                    style={{ width: `${entry.pastPercentage}%` }}
                    title={`Geçmiş: %${entry.pastPercentage}`}
                  />
                  <div
                    className="bg-blue-500"
                    style={{ width: `${entry.todayPercentage}%` }}
                    title={`Bugün: %${entry.todayPercentage}`}
                  />
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${entry.futurePercentage}%` }}
                    title={`Yarın: %${entry.futurePercentage}`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
