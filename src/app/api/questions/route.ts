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
  const source = searchParams.get("source");
  const grade = searchParams.get("grade"); // MS | HS | ALL
  const search = searchParams.get("search");

  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const requestedSize = parseInt(pageSizeParam ?? "50", 10) || 50;
  const pageSize = Math.min(200, Math.max(1, requestedSize));

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (difficulty) where.difficulty = parseInt(difficulty, 10);
  if (questionType) where.questionType = questionType;
  if (source) where.source = source;

  const andClauses: Record<string, unknown>[] = [];
  if (grade === "MS") {
    andClauses.push({
      source: { contains: "-MS", mode: "insensitive" },
    });
  } else if (grade === "HS") {
    andClauses.push({
      source: { contains: "-HS", mode: "insensitive" },
    });
  }

  if (search && search.trim()) {
    const term = search.trim();
    andClauses.push({
      OR: [
        { questionText: { contains: term, mode: "insensitive" } },
        { correctAnswer: { contains: term, mode: "insensitive" } },
        { topic: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const hasMore = page * pageSize < total;

  return NextResponse.json({ items, total, hasMore, page, pageSize });
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
