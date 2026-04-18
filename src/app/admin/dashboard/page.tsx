import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const [totalStudents, totalCoaches, totalQuestions, recentQuizzes, recentLogs] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "COACH" } }),
      prisma.question.count(),
      prisma.quizSession.findMany({
        where: { completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      prisma.studyLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
    ]);

  const stats = [
    { label: "Total Students", value: totalStudents, icon: "👥" },
    { label: "Total Coaches", value: totalCoaches, icon: "🧑‍🏫" },
    { label: "Questions in Bank", value: totalQuestions, icon: "❓" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Admin Dashboard
      </h1>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Quiz Activity */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Quiz Activity
        </h2>
        {recentQuizzes.length === 0 ? (
          <p className="text-gray-500">No completed quizzes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{quiz.user.name}</td>
                    <td className="py-2 text-gray-900">
                      {quiz.correctCount}/{quiz.totalQuestions}
                      <span className="ml-1 text-gray-500">
                        (
                        {quiz.totalQuestions > 0
                          ? Math.round(
                              (quiz.correctCount / quiz.totalQuestions) * 100
                            )
                          : 0}
                        %)
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {quiz.completedAt
                        ? new Date(quiz.completedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Study Logs */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Study Logs
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-500">No study logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Topic</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{log.user.name}</td>
                    <td className="py-2 text-gray-900">{log.subject}</td>
                    <td className="py-2 text-gray-900">{log.topic}</td>
                    <td className="py-2 text-gray-500">
                      {log.timeSpentMin} min
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(log.studyDate).toLocaleDateString()}
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
