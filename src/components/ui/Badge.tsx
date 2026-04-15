type BadgeVariant = "past" | "today" | "future" | "admin" | "user" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  past: "bg-amber-100 text-amber-800",
  today: "bg-blue-100 text-blue-800",
  future: "bg-emerald-100 text-emerald-800",
  admin: "bg-purple-100 text-purple-800",
  user: "bg-gray-100 text-gray-700",
  neutral: "bg-gray-100 text-gray-600",
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
