import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");
  const difficulty = searchParams.get("difficulty");
  const questionType = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (difficulty) where.difficulty = parseInt(difficulty, 10);
  if (questionType) where.questionType = questionType;

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const {
    subject,
    topic,
    difficulty,
    questionType,
    answerFormat,
    questionText,
    choices,
    correctAnswer,
  } = body;

  if (!subject || !questionText || !correctAnswer) {
    return NextResponse.json(
      { error: "Subject, questionText, and correctAnswer are required." },
      { status: 400 }
    );
  }

  const question = await prisma.question.create({
    data: {
      subject,
      topic: topic || "",
      difficulty: difficulty ? parseInt(difficulty, 10) : 4,
      questionType: questionType || "TOSS_UP",
      answerFormat: answerFormat || "MULTIPLE_CHOICE",
      questionText,
      choices: choices ? JSON.stringify(choices) : null,
      correctAnswer,
    },
  });

  return NextResponse.json(question, { status: 201 });
}
