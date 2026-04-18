import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await requireRole(["ADMIN", "COACH", "STUDENT"]);
  const userId = session.user.id;
  const userName = session.user.name ?? "Student";

  // Fetch data in parallel
  const [studyLogs, quizSessions, recentStudyLogs, recentQuizzes] =
    await Promise.all([
      prisma.studyLog.findMany({ where: { userId } }),
      prisma.quizSession.findMany({
        where: { userId, completedAt: { not: null } },
      }),
      prisma.studyLog.findMany({
        where: { userId },
        orderBy: { studyDate: "desc" },
        take: 5,
      }),
      prisma.quizSession.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
    ]);

  // Total study hours
  const totalMinutes = studyLogs.reduce((s, l) => s + l.timeSpentMin, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Total quizzes taken
  const totalQuizzes = quizSessions.length;

  // Average quiz score
  const avgScore =
    totalQuizzes > 0
      ? Math.round(
          (quizSessions.reduce(
            (s, q) => s + (q.correctCount / q.totalQuestions) * 100,
            0
          ) /
            totalQuizzes) *
            10
        ) / 10
      : 0;

  // Study streak (consecutive days with study logs ending today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const uniqueDays = new Set(
    studyLogs.map((l) => {
      const d = new Date(l.studyDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const dayMs = 86400000;
  for (let i = 0; i < 365; i++) {
    const checkDay = new Date(today.getTime() - i * dayMs).getTime();
    if (uniqueDays.has(checkDay)) {
      streak++;
    } else {
      break;
    }
  }

  // Interleave recent activity
  type Activity =
    | { type: "study"; date: Date; data: (typeof recentStudyLogs)[0] }
    | { type: "quiz"; date: Date; data: (typeof recentQuizzes)[0] };

  const activities: Activity[] = [
    ...recentStudyLogs.map(
      (l) => ({ type: "study" as const, date: new Date(l.studyDate), data: l })
    ),
    ...recentQuizzes.map(
      (q) =>
        ({
          type: "quiz" as const,
          date: new Date(q.completedAt!),
          data: q,
        })
    ),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const subjectLabel = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Welcome back, {userName}! 👋
      </h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Study Hours"
          value={`${totalHours}h`}
          icon="📚"
          color="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          title="Quizzes Taken"
          value={`${totalQuizzes}`}
          icon="📝"
          color="bg-green-50 text-green-700"
        />
        <SummaryCard
          title="Avg Quiz Score"
          value={`${avgScore}%`}
          icon="🎯"
          color="bg-purple-50 text-purple-700"
        />
        <SummaryCard
          title="Study Streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          icon="🔥"
          color="bg-orange-50 text-orange-700"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/student/study-log"
          className="rounded-lg bg-[#0078d4] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006abc] transition-colors"
        >
          + Log Study Session
        </Link>
        <Link
          href="/student/quiz"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
        >
          Start Quiz
        </Link>
        <Link
          href="/student/progress"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          View Progress
        </Link>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No activity yet. Start by logging a study session or taking a quiz!
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activities.map((a, i) => (
              <li key={i} className="px-6 py-4">
                {a.type === "study" ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">
                      📚
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Studied{" "}
                        <span className="text-[#0078d4]">
                          {subjectLabel(a.data.subject)}
                        </span>{" "}
                        — {(a.data as (typeof recentStudyLogs)[0]).topic}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(a.data as (typeof recentStudyLogs)[0]).timeSpentMin}{" "}
                        min · {a.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm">
                      📝
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Quiz completed —{" "}
                        {(a.data as (typeof recentQuizzes)[0]).correctCount}/
                        {(a.data as (typeof recentQuizzes)[0]).totalQuestions}{" "}
                        correct
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(
                          ((a.data as (typeof recentQuizzes)[0]).correctCount /
                            (a.data as (typeof recentQuizzes)[0])
                              .totalQuestions) *
                            100
                        )}
                        % · {a.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${color}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
