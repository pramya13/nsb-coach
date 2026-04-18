import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  // Allow coaches to view a student's progress
  const targetUserId = searchParams.get("userId") ?? session.user.id;

  // If viewing another user, verify current user is coach/admin
  if (targetUserId !== session.user.id) {
    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "COACH"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const subjectFilter = searchParams.get("subject");

  // Study difficulty trend (avg self-difficulty per day)
  const studyWhere = {
    userId: targetUserId,
    ...(subjectFilter ? { subject: subjectFilter } : {}),
  };

  const studyLogs = await prisma.studyLog.findMany({
    where: studyWhere,
    orderBy: { studyDate: "asc" },
    select: { studyDate: true, selfDifficulty: true, subject: true },
  });

  // Group by date
  const difficultyByDate = new Map<
    string,
    { total: number; count: number }
  >();
  for (const log of studyLogs) {
    const key = new Date(log.studyDate).toISOString().split("T")[0];
    const entry = difficultyByDate.get(key) ?? { total: 0, count: 0 };
    entry.total += log.selfDifficulty;
    entry.count++;
    difficultyByDate.set(key, entry);
  }
  const difficultyTrend = Array.from(difficultyByDate.entries()).map(
    ([date, { total, count }]) => ({
      date,
      avgDifficulty: Math.round((total / count) * 100) / 100,
    })
  );

  // Quiz accuracy trend
  const quizWhere = {
    userId: targetUserId,
    completedAt: { not: null as null | undefined },
    ...(subjectFilter
      ? { subjectsSelected: { contains: subjectFilter } }
      : {}),
  };

  const quizSessions = await prisma.quizSession.findMany({
    where: quizWhere,
    orderBy: { completedAt: "asc" },
    select: {
      completedAt: true,
      correctCount: true,
      totalQuestions: true,
    },
  });

  const accuracyTrend = quizSessions.map((q) => ({
    date: q.completedAt!.toISOString().split("T")[0],
    percent: Math.round((q.correctCount / q.totalQuestions) * 100),
  }));

  // Monthly test scores
  const monthlyTests = await prisma.monthlyTest.findMany({
    where: { userId: targetUserId },
    orderBy: { testDate: "asc" },
    select: {
      id: true,
      testDate: true,
      score: true,
      total: true,
      percentAccuracy: true,
      notes: true,
    },
  });

  return NextResponse.json({
    difficultyTrend,
    accuracyTrend,
    monthlyTests,
  });
}
