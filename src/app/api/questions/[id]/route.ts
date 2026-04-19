import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type UpdateBody = {
  subject?: string;
  topic?: string;
  difficulty?: string | number;
  questionType?: string;
  answerFormat?: string;
  questionText?: string;
  choices?: string[] | string | null;
  correctAnswer?: string;
};

async function applyUpdate(id: string, body: UpdateBody) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return null;

  let choicesValue: string | null | undefined = undefined;
  if (body.choices !== undefined) {
    if (body.choices === null || body.choices === "") {
      choicesValue = null;
    } else if (Array.isArray(body.choices)) {
      choicesValue = JSON.stringify(body.choices);
    } else if (typeof body.choices === "string") {
      const trimmed = body.choices.trim();
      if (!trimmed) {
        choicesValue = null;
      } else {
        try {
          const parsed = JSON.parse(trimmed);
          choicesValue = JSON.stringify(parsed);
        } catch {
          choicesValue = JSON.stringify(
            trimmed.split(",").map((c) => c.trim())
          );
        }
      }
    }
  }

  return prisma.question.update({
    where: { id },
    data: {
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.topic !== undefined && { topic: body.topic }),
      ...(body.difficulty !== undefined && {
        difficulty:
          typeof body.difficulty === "number"
            ? body.difficulty
            : parseInt(String(body.difficulty), 10),
      }),
      ...(body.questionType !== undefined && { questionType: body.questionType }),
      ...(body.answerFormat !== undefined && { answerFormat: body.answerFormat }),
      ...(body.questionText !== undefined && { questionText: body.questionText }),
      ...(choicesValue !== undefined && { choices: choicesValue }),
      ...(body.correctAnswer !== undefined && { correctAnswer: body.correctAnswer }),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateBody;

  const updated = await applyUpdate(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

// Keep PUT for backward compatibility; ADMIN-only.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateBody;

  const updated = await applyUpdate(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  // Delete dependent QuizAnswer rows first to satisfy FK constraint.
  await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { questionId: id } }),
    prisma.question.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
