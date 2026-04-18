import { prisma } from "@/lib/db";

interface InsightData {
  studentId: string;
  studentName: string;
  difficultyTrend: "up" | "down" | "flat";
  accuracyTrend: "up" | "down" | "flat";
  insight: string;
  color: string;
}

function getTrend(recent: number, previous: number): "up" | "down" | "flat" {
  const diff = recent - previous;
  if (Math.abs(diff) < 0.3) return "flat";
  return diff > 0 ? "up" : "down";
}

function getInsight(
  diffTrend: "up" | "down" | "flat",
  accTrend: "up" | "down" | "flat"
): { text: string; color: string } {
  if (diffTrend === "up" && accTrend === "up")
    return { text: "Strong learning — progressing well", color: "green" };
  if (diffTrend === "up" && accTrend === "down")
    return { text: "May be pushing too fast", color: "orange" };
  if (diffTrend === "flat" && accTrend === "up")
    return { text: "Ready for harder material", color: "blue" };
  if (diffTrend === "down" && accTrend === "down")
    return { text: "Needs attention", color: "red" };
  return { text: "Steady pace", color: "gray" };
}

const colorClasses: Record<string, string> = {
  green: "border-green-400 bg-green-50 text-green-800",
  orange: "border-orange-400 bg-orange-50 text-orange-800",
  blue: "border-blue-400 bg-blue-50 text-blue-800",
  red: "border-red-400 bg-red-50 text-red-800",
  gray: "border-gray-300 bg-gray-50 text-gray-700",
};

export default async function CoachDashboard() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const [totalStudents, activeStudentIds, questionCount, quizSessions] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.studyLog.findMany({
        where: { studyDate: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.question.count(),
      prisma.quizSession.findMany({
        where: { completedAt: { not: null } },
        select: { correctCount: true, totalQuestions: true },
      }),
    ]);

  const activeCount = activeStudentIds.length;
  const avgQuizScore =
    quizSessions.length > 0
      ? Math.round(
          (quizSessions.reduce(
            (sum, q) =>
              sum +
              (q.totalQuestions > 0
                ? (q.correctCount / q.totalQuestions) * 100
                : 0),
            0
          ) /
            quizSessions.length) *
            10
        ) / 10
      : 0;

  // Coaching insights for active students
  const activeUserIds = activeStudentIds.map((s) => s.userId);
  const activeStudents = await prisma.user.findMany({
    where: { id: { in: activeUserIds } },
    select: { id: true, name: true },
  });

  const insights: InsightData[] = [];

  for (const student of activeStudents) {
    const [recentLogs, prevLogs, recentQuizzes, prevQuizzes] =
      await Promise.all([
        prisma.studyLog.findMany({
          where: {
            userId: student.id,
            studyDate: { gte: twoWeeksAgo },
          },
          select: { selfDifficulty: true },
        }),
        prisma.studyLog.findMany({
          where: {
            userId: student.id,
            studyDate: { gte: fourWeeksAgo, lt: twoWeeksAgo },
          },
          select: { selfDifficulty: true },
        }),
        prisma.quizSession.findMany({
          where: {
            userId: student.id,
            completedAt: { gte: twoWeeksAgo },
          },
          select: { correctCount: true, totalQuestions: true },
        }),
        prisma.quizSession.findMany({
          where: {
            userId: student.id,
            completedAt: { gte: fourWeeksAgo, lt: twoWeeksAgo },
          },
          select: { correctCount: true, totalQuestions: true },
        }),
      ]);

    const avgRecentDiff =
      recentLogs.length > 0
        ? recentLogs.reduce((s, l) => s + l.selfDifficulty, 0) /
          recentLogs.length
        : 3;
    const avgPrevDiff =
      prevLogs.length > 0
        ? prevLogs.reduce((s, l) => s + l.selfDifficulty, 0) / prevLogs.length
        : 3;

    const avgRecentAcc =
      recentQuizzes.length > 0
        ? recentQuizzes.reduce(
            (s, q) =>
              s +
              (q.totalQuestions > 0
                ? (q.correctCount / q.totalQuestions) * 100
                : 0),
            0
          ) / recentQuizzes.length
        : 50;
    const avgPrevAcc =
      prevQuizzes.length > 0
        ? prevQuizzes.reduce(
            (s, q) =>
              s +
              (q.totalQuestions > 0
                ? (q.correctCount / q.totalQuestions) * 100
                : 0),
            0
          ) / prevQuizzes.length
        : 50;

    const diffTrend = getTrend(avgRecentDiff, avgPrevDiff);
    const accTrend = getTrend(avgRecentAcc, avgPrevAcc);
    const { text, color } = getInsight(diffTrend, accTrend);

    insights.push({
      studentId: student.id,
      studentName: student.name,
      difficultyTrend: diffTrend,
      accuracyTrend: accTrend,
      insight: text,
      color,
    });
  }

  const stats = [
    { label: "Total Students", value: totalStudents, icon: "👥" },
    { label: "Active (7 days)", value: activeCount, icon: "📚" },
    { label: "Avg Quiz Score", value: `${avgQuizScore}%`, icon: "📊" },
    { label: "Questions in Bank", value: questionCount, icon: "❓" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Coach Dashboard
      </h1>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coaching Insights */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Coaching Insights
        </h2>
        {insights.length === 0 ? (
          <p className="text-gray-500">
            No active students in the last 7 days.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((item) => (
              <div
                key={item.studentId}
                className={`rounded-lg border-l-4 p-4 ${colorClasses[item.color]}`}
              >
                <p className="font-semibold">{item.studentName}</p>
                <p className="mt-1 text-sm">{item.insight}</p>
                <div className="mt-2 flex gap-4 text-xs opacity-75">
                  <span>
                    Difficulty{" "}
                    {item.difficultyTrend === "up"
                      ? "↑"
                      : item.difficultyTrend === "down"
                        ? "↓"
                        : "→"}
                  </span>
                  <span>
                    Accuracy{" "}
                    {item.accuracyTrend === "up"
                      ? "↑"
                      : item.accuracyTrend === "down"
                        ? "↓"
                        : "→"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
