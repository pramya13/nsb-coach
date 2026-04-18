import { requireRole } from "@/lib/auth-utils";
import NavBar from "@/components/NavBar";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["ADMIN", "COACH"]);

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-gray-50">{children}</main>
    </>
  );
}
