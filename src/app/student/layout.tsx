import { requireRole } from "@/lib/auth-utils";
import NavBar from "@/components/NavBar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["ADMIN", "COACH", "STUDENT"]);

  return (
    <>
      <NavBar />
      <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
        {children}
      </main>
    </>
  );
}
