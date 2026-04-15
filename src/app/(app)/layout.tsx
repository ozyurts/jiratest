/**
 * Protected app layout — fetches current user server-side and passes to Navbar.
 * Middleware already handles redirect; this is a secondary safety net.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/shared/Navbar";
import type { MeDto } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) redirect("/login");

  const dbUser = await prisma.user.findFirst({
    where: { id: tokenUser.sub, isDeleted: "NO" },
    include: { team: true },
  });

  if (!dbUser) redirect("/login");

  const me: MeDto = {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    role: dbUser.role as "USER" | "ADMIN",
    teamId: dbUser.teamId,
    teamName: dbUser.team?.name ?? null,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={me} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
