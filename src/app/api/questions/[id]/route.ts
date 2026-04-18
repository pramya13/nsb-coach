import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
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

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const question = await prisma.question.update({
    where: { id },
    data: {
      ...(subject !== undefined && { subject }),
      ...(topic !== undefined && { topic }),
      ...(difficulty !== undefined && { difficulty: parseInt(difficulty, 10) }),
      ...(questionType !== undefined && { questionType }),
      ...(answerFormat !== undefined && { answerFormat }),
      ...(questionText !== undefined && { questionText }),
      ...(choices !== undefined && {
        choices: choices ? JSON.stringify(choices) : null,
      }),
      ...(correctAnswer !== undefined && { correctAnswer }),
    },
  });

  return NextResponse.json(question);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  await prisma.question.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
