"use client";

import type { MemberSummaryDto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatWeekLabel } from "@/lib/week";

interface MemberSummaryTableProps {
  members: MemberSummaryDto[];
  onSelectUser?: (userId: string) => void;
  selectedUserId?: string;
}

export function MemberSummaryTable({
  members,
  onSelectUser,
  selectedUserId,
}: MemberSummaryTableProps) {
  if (members.length === 0) {
    return <p className="text-center py-8 text-sm text-gray-500">Henüz üye bulunmuyor.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="pb-3 pr-4">Kişi</th>
            <th className="pb-3 pr-4">Takım</th>
            <th className="pb-3 pr-4">Son Giriş</th>
            <th className="pb-3 pr-4 text-amber-600">Geçmiş</th>
            <th className="pb-3 pr-4 text-blue-600">Bugün</th>
            <th className="pb-3 pr-4 text-emerald-600">Yarın</th>
            <th className="pb-3">Dağılım</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map((m) => {
            const hasData = m.latestWeek !== null;
            const isSelected = m.userId === selectedUserId;
            return (
              <tr
                key={m.userId}
                className={`transition-colors ${
                  onSelectUser ? "cursor-pointer hover:bg-primary-50" : ""
                } ${isSelected ? "bg-primary-50" : ""}`}
                onClick={() => onSelectUser?.(m.userId)}
              >
                <td className="py-3 pr-4 font-medium text-gray-900">{m.fullName}</td>
                <td className="py-3 pr-4 text-gray-500">{m.teamName ?? "—"}</td>
                <td className="py-3 pr-4 text-gray-500 text-xs">
                  {hasData
                    ? formatWeekLabel(new Date(m.latestWeek! + "T00:00:00Z"))
                    : <span className="text-red-400">Giriş yok</span>}
                </td>
                <td className="py-3 pr-4">
                  {hasData ? <Badge variant="past">%{m.pastPercentage}</Badge> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4">
                  {hasData ? <Badge variant="today">%{m.todayPercentage}</Badge> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4">
                  {hasData ? <Badge variant="future">%{m.futurePercentage}</Badge> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 min-w-[100px]">
                  {hasData ? (
                    <div className="flex h-3 w-24 rounded-full overflow-hidden">
                      <div className="bg-amber-400" style={{ width: `${m.pastPercentage}%` }} />
                      <div className="bg-blue-500" style={{ width: `${m.todayPercentage}%` }} />
                      <div className="bg-emerald-500" style={{ width: `${m.futurePercentage}%` }} />
                    </div>
                  ) : (
                    <div className="h-3 w-24 rounded-full bg-gray-100" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
