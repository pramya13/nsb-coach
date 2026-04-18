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
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.studyLog.findMany({
      where: { userId: session.user.id },
      orderBy: { studyDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.studyLog.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    subject,
    topic,
    subtopic,
    timeSpentMin,
    selfDifficulty,
    isReview,
    notes,
    studyDate,
  } = body;

  if (!subject || !topic || !timeSpentMin || !selfDifficulty || !studyDate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (selfDifficulty < 1 || selfDifficulty > 5) {
    return NextResponse.json(
      { error: "selfDifficulty must be 1-5" },
      { status: 400 }
    );
  }

  const log = await prisma.studyLog.create({
    data: {
      userId: session.user.id,
      subject,
      topic,
      subtopic: subtopic || null,
      timeSpentMin: parseInt(timeSpentMin, 10),
      selfDifficulty: parseInt(selfDifficulty, 10),
      isReview: Boolean(isReview),
      notes: notes || null,
      studyDate: new Date(studyDate),
    },
  });

  return NextResponse.json(log, { status: 201 });
}
