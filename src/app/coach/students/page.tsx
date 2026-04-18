import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function CoachStudentsPage() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: {
      studyLogs: {
        select: { timeSpentMin: true, studyDate: true },
      },
      quizSessions: {
        where: { completedAt: { not: null } },
        select: { correctCount: true, totalQuestions: true, completedAt: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const studentCards = students.map((student) => {
    const totalMinutes = student.studyLogs.reduce(
      (sum, l) => sum + l.timeSpentMin,
      0
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const quizzesTaken = student.quizSessions.length;
    const avgAccuracy =
      quizzesTaken > 0
        ? Math.round(
            (student.quizSessions.reduce(
              (sum, q) =>
                sum +
                (q.totalQuestions > 0
                  ? (q.correctCount / q.totalQuestions) * 100
                  : 0),
              0
            ) /
              quizzesTaken) *
              10
          ) / 10
        : 0;

    const allDates = [
      ...student.studyLogs.map((l) => l.studyDate),
      ...student.quizSessions
        .filter((q) => q.completedAt)
        .map((q) => q.completedAt!),
    ];
    const lastActive =
      allDates.length > 0
        ? new Date(Math.max(...allDates.map((d) => d.getTime())))
        : null;

    return {
      id: student.id,
      name: student.name,
      totalHours,
      quizzesTaken,
      avgAccuracy,
      lastActive,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Students</h1>

      {studentCards.length === 0 ? (
        <p className="text-gray-500">No students found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentCards.map((s) => (
            <Link
              key={s.id}
              href={`/coach/students/${s.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-900">
                    {s.totalHours}h
                  </span>{" "}
                  study time
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {s.quizzesTaken}
                  </span>{" "}
                  quizzes
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {s.avgAccuracy}%
                  </span>{" "}
                  accuracy
                </div>
                <div>
                  {s.lastActive ? (
                    <>
                      Last active{" "}
                      <span className="font-medium text-gray-900">
                        {s.lastActive.toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">No activity</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
