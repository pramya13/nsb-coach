import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { subjects, totalQuestions = 15, format = "QA" } = body;

  if (
    !subjects ||
    !Array.isArray(subjects) ||
    subjects.length === 0
  ) {
    return NextResponse.json(
      { error: "At least one subject must be selected" },
      { status: 400 }
    );
  }

  // Grade-level filter for STUDENTS. Admin/coach get no grade restriction.
  // If gradeLevel missing on a student, default to MS (safest).
  let gradeFilter: Record<string, unknown> | null = null;
  if (session.user.role === "STUDENT") {
    const studentRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { gradeLevel: true },
    });
    const grade = studentRecord?.gradeLevel || "MS";
    const tag = grade === "HS" ? "-HS" : "-MS";
    gradeFilter = { source: { contains: tag, mode: "insensitive" } };
  }

  // Get recently correctly answered question IDs (last 5 quizzes)
  const recentQuizzes = await prisma.quizSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { id: true },
  });

  const recentCorrectIds: string[] = [];
  if (recentQuizzes.length > 0) {
    const correctAnswers = await prisma.quizAnswer.findMany({
      where: {
        quizSessionId: { in: recentQuizzes.map((q) => q.id) },
        isCorrect: true,
      },
      select: { questionId: true },
    });
    recentCorrectIds.push(...correctAnswers.map((a) => a.questionId));
  }

  // Determine student's current level from recent quiz avg difficulty
  const recentAnswers = await prisma.quizAnswer.findMany({
    where: {
      quizSession: { userId },
    },
    include: { question: { select: { difficulty: true } } },
    orderBy: { answeredAt: "desc" },
    take: 50,
  });

  let studentLevel = 3; // default mid level
  if (recentAnswers.length > 0) {
    studentLevel = Math.round(
      recentAnswers.reduce((s, a) => s + a.question.difficulty, 0) /
        recentAnswers.length
    );
  }

  // Build question selection with difficulty distribution
  // 40% current level, 30% slightly harder, 20% slightly easier, 10% much harder
  const counts = {
    current: Math.ceil(totalQuestions * 0.4),
    harder: Math.ceil(totalQuestions * 0.3),
    easier: Math.ceil(totalQuestions * 0.2),
    muchHarder: totalQuestions - Math.ceil(totalQuestions * 0.4) - Math.ceil(totalQuestions * 0.3) - Math.ceil(totalQuestions * 0.2),
  };

  const excludeIds = [...new Set(recentCorrectIds)];
  const baseWhere = {
    subject: { in: subjects },
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    ...(gradeFilter || {}),
  };

  // Fetch questions for each difficulty bucket
  const [currentQ, harderQ, easierQ, muchHarderQ] = await Promise.all([
    prisma.question.findMany({
      where: { ...baseWhere, difficulty: studentLevel },
      take: counts.current * 3,
    }),
    prisma.question.findMany({
      where: {
        ...baseWhere,
        difficulty: Math.min(studentLevel + 1, 5),
      },
      take: counts.harder * 3,
    }),
    prisma.question.findMany({
      where: {
        ...baseWhere,
        difficulty: Math.max(studentLevel - 1, 1),
      },
      take: counts.easier * 3,
    }),
    prisma.question.findMany({
      where: {
        ...baseWhere,
        difficulty: Math.min(studentLevel + 2, 5),
      },
      take: counts.muchHarder * 3,
    }),
  ]);

  // Shuffle helper
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Pick from each bucket
  const selected: typeof currentQ = [];
  const usedIds = new Set<string>();

  const pickFrom = (pool: typeof currentQ, count: number) => {
    const shuffled = shuffle(pool);
    for (const q of shuffled) {
      if (selected.length >= totalQuestions) break;
      if (usedIds.has(q.id)) continue;
      if (selected.length - (totalQuestions - count) >= count) break;
      usedIds.add(q.id);
      selected.push(q);
    }
  };

  pickFrom(currentQ, counts.current);
  pickFrom(harderQ, counts.harder);
  pickFrom(easierQ, counts.easier);
  pickFrom(muchHarderQ, counts.muchHarder);

  // If not enough questions, relax filters and fill up
  if (selected.length < totalQuestions) {
    const remaining = await prisma.question.findMany({
      where: {
        subject: { in: subjects },
        id: { notIn: [...usedIds] },
        ...(gradeFilter || {}),
      },
      take: (totalQuestions - selected.length) * 3,
    });
    for (const q of shuffle(remaining)) {
      if (selected.length >= totalQuestions) break;
      if (usedIds.has(q.id)) continue;
      usedIds.add(q.id);
      selected.push(q);
    }
  }

  // If still not enough, include previously correct ones
  if (selected.length < totalQuestions) {
    const fallback = await prisma.question.findMany({
      where: {
        subject: { in: subjects },
        id: { notIn: [...usedIds] },
        ...(gradeFilter || {}),
      },
      take: (totalQuestions - selected.length) * 2,
    });
    for (const q of shuffle(fallback)) {
      if (selected.length >= totalQuestions) break;
      if (usedIds.has(q.id)) continue;
      usedIds.add(q.id);
      selected.push(q);
    }
  }

  const finalQuestions = shuffle(selected);

  // Create quiz session
  const quizSession = await prisma.quizSession.create({
    data: {
      userId,
      format,
      subjectsSelected: JSON.stringify(subjects),
      totalQuestions: finalQuestions.length,
    },
  });

  // Return questions without correct answers
  const questionsForClient = finalQuestions.map((q) => ({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    questionType: q.questionType,
    answerFormat: q.answerFormat,
    questionText: q.questionText,
    choices: q.choices ? JSON.parse(q.choices) : null,
  }));

  return NextResponse.json({
    quizSessionId: quizSession.id,
    questions: questionsForClient,
    format,
    totalQuestions: finalQuestions.length,
  });
}
