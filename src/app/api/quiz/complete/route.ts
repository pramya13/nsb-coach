import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { quizSessionId } = body;

  if (!quizSessionId) {
    return NextResponse.json(
      { error: "Missing quizSessionId" },
      { status: 400 }
    );
  }

  // Verify quiz session belongs to user
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: quizSessionId },
    include: {
      answers: {
        include: {
          question: { select: { difficulty: true, subject: true } },
        },
      },
    },
  });

  if (!quizSession || quizSession.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Quiz session not found" },
      { status: 404 }
    );
  }

  if (quizSession.completedAt) {
    return NextResponse.json(
      { error: "Quiz already completed" },
      { status: 400 }
    );
  }

  const answers = quizSession.answers;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const avgDifficulty =
    answers.length > 0
      ? answers.reduce((s, a) => s + a.question.difficulty, 0) / answers.length
      : 0;

  // Calculate per-subject breakdown
  const subjectMap = new Map<
    string,
    { correct: number; total: number }
  >();
  for (const a of answers) {
    const subj = a.question.subject;
    const entry = subjectMap.get(subj) ?? { correct: 0, total: 0 };
    entry.total++;
    if (a.isCorrect) entry.correct++;
    subjectMap.set(subj, entry);
  }
  const subjectBreakdown = Array.from(subjectMap.entries()).map(
    ([subject, { correct, total }]) => ({
      subject,
      correct,
      total,
      percent: Math.round((correct / total) * 100),
    })
  );

  // Update quiz session
  const updated = await prisma.quizSession.update({
    where: { id: quizSessionId },
    data: {
      correctCount,
      avgDifficulty: Math.round(avgDifficulty * 100) / 100,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    correctCount,
    totalQuestions: updated.totalQuestions,
    percent: Math.round((correctCount / updated.totalQuestions) * 100),
    avgDifficulty: updated.avgDifficulty,
    subjectBreakdown,
  });
}
