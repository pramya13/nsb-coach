import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StudentCharts from "@/components/StudentCharts";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id, role: "STUDENT" },
    include: {
      studyLogs: { orderBy: { studyDate: "desc" } },
      quizSessions: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
      },
      monthlyTests: { orderBy: { testDate: "desc" } },
    },
  });

  if (!student) notFound();

  const totalMinutes = student.studyLogs.reduce(
    (sum, l) => sum + l.timeSpentMin,
    0
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const quizCount = student.quizSessions.length;
  const avgQuizAccuracy =
    quizCount > 0
      ? Math.round(
          (student.quizSessions.reduce(
            (sum, q) =>
              sum +
              (q.totalQuestions > 0
                ? (q.correctCount / q.totalQuestions) * 100
                : 0),
            0
          ) /
            quizCount) *
            10
        ) / 10
      : 0;
  const avgMonthlyTest =
    student.monthlyTests.length > 0
      ? Math.round(
          (student.monthlyTests.reduce(
            (sum, t) => sum + t.percentAccuracy,
            0
          ) /
            student.monthlyTests.length) *
            10
        ) / 10
      : 0;

  // Chart data
  const studyData = [...student.studyLogs]
    .reverse()
    .map((l) => ({
      date: l.studyDate.toISOString().split("T")[0],
      difficulty: l.selfDifficulty,
    }));

  const quizData = [...student.quizSessions]
    .reverse()
    .map((q) => ({
      date: (q.completedAt ?? q.startedAt).toISOString().split("T")[0],
      accuracy:
        q.totalQuestions > 0
          ? Math.round((q.correctCount / q.totalQuestions) * 1000) / 10
          : 0,
    }));

  const testData = [...student.monthlyTests]
    .reverse()
    .map((t) => ({
      date: t.testDate.toISOString().split("T")[0],
      accuracy: Math.round(t.percentAccuracy * 10) / 10,
    }));

  const recentLogs = student.studyLogs.slice(0, 20);
  const recentQuizzes = student.quizSessions.slice(0, 10);

  const stats = [
    { label: "Total Study Hours", value: `${totalHours}h`, icon: "📚" },
    { label: "Quizzes Taken", value: quizCount, icon: "📝" },
    { label: "Avg Quiz Accuracy", value: `${avgQuizAccuracy}%`, icon: "🎯" },
    { label: "Avg Monthly Test", value: `${avgMonthlyTest}%`, icon: "📊" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
        <p className="text-sm text-gray-500">
          {student.email} · Joined{" "}
          {student.createdAt.toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">📈 Progress Trends</h2>
        <StudentCharts
          studyData={studyData}
          quizData={quizData}
          testData={testData}
        />
      </div>

      {/* Recent Study Logs */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Study Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Topic</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Difficulty</th>
                <th className="px-6 py-3">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    {log.studyDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">{log.subject}</td>
                  <td className="px-6 py-3">{log.topic}</td>
                  <td className="px-6 py-3">{log.timeSpentMin} min</td>
                  <td className="px-6 py-3">{log.selfDifficulty}/5</td>
                  <td className="px-6 py-3">{log.isReview ? "Yes" : "No"}</td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No study logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Quiz Results */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Quiz Results
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Format</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentQuizzes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    {(q.completedAt ?? q.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">{q.format}</td>
                  <td className="px-6 py-3">
                    {q.correctCount}/{q.totalQuestions}
                  </td>
                  <td className="px-6 py-3">
                    {q.totalQuestions > 0
                      ? Math.round(
                          (q.correctCount / q.totalQuestions) * 1000
                        ) / 10
                      : 0}
                    %
                  </td>
                </tr>
              ))}
              {recentQuizzes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    No quizzes taken yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Test Scores */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Test Scores
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Accuracy</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {student.monthlyTests.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    {t.testDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    {t.score}/{t.total}
                  </td>
                  <td className="px-6 py-3">
                    {Math.round(t.percentAccuracy * 10) / 10}%
                  </td>
                  <td className="px-6 py-3">{t.notes || "—"}</td>
                </tr>
              ))}
              {student.monthlyTests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    No monthly tests recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
