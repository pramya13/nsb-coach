import { prisma } from "@/lib/db";

export default async function CoachesPage() {
  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Coaches</h1>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {coaches.length === 0 ? (
          <p className="p-6 text-gray-500">No coaches registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr
                    key={coach.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {coach.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{coach.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(coach.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
