import { requireRole } from "@/lib/auth-utils";
import NavBar from "@/components/NavBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");

  return (
    <>
      <NavBar />
      <main className="min-h-[calc(100vh-3.5rem)] bg-gray-50">
        {children}
      </main>
    </>
  );
}
