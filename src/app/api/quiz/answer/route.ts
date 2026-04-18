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
  const { quizSessionId, questionId, userAnswer } = body;

  if (!quizSessionId || !questionId || userAnswer === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify quiz session belongs to user
  const quizSession = await prisma.quizSession.findUnique({
    where: { id: quizSessionId },
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

  // Get the question with correct answer
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  // Check correctness (case-insensitive, trimmed)
  const normalizedUser = userAnswer.toString().trim().toLowerCase();
  const normalizedCorrect = question.correctAnswer.trim().toLowerCase();
  const isCorrect = normalizedUser === normalizedCorrect;

  // Check if already answered
  const existing = await prisma.quizAnswer.findFirst({
    where: { quizSessionId, questionId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Question already answered" },
      { status: 400 }
    );
  }

  // Create quiz answer
  await prisma.quizAnswer.create({
    data: {
      quizSessionId,
      questionId,
      userAnswer: userAnswer.toString().trim(),
      isCorrect,
    },
  });

  return NextResponse.json({
    isCorrect,
    correctAnswer: question.correctAnswer,
  });
}
