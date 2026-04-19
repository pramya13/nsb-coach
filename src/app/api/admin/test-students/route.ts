import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

const SUBJECTS = ["MATH", "BIOLOGY", "LIFE_SCIENCE", "CHEMISTRY", "PHYSICS", "PHYSICAL_SCIENCE", "GENERAL_SCIENCE", "ASTRONOMY", "EARTH_SCIENCE", "EARTH_AND_SPACE", "ENERGY"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(request: Request) {
  await requireRole(["ADMIN"]);

  try {
    const body = await request.json();
    const { name, email, password, seedData, gradeLevel } = body as {
      name?: string;
      email?: string;
      password?: string;
      seedData?: boolean;
      gradeLevel?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const normalizedGrade =
      gradeLevel === "HS" ? "HS" : "MS";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "STUDENT",
        gradeLevel: normalizedGrade,
      },
    });

    if (seedData) {
      // Seed 14 days of study logs
      const logs = [];
      const now = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const subject = randomFrom(SUBJECTS);
        logs.push({
          userId: user.id,
          subject,
          topic: "General",
          timeSpentMin: 20 + Math.floor(Math.random() * 60),
          selfDifficulty: 1 + Math.floor(Math.random() * 5),
          isReview: Math.random() > 0.5,
          notes: `Sample study session ${i + 1}`,
          studyDate: date,
        });
      }
      await prisma.studyLog.createMany({ data: logs });

      // Seed 2 quiz sessions with random correct/incorrect answers
      const questions = await prisma.question.findMany({ take: 20 });
      if (questions.length > 0) {
        for (let s = 0; s < 2; s++) {
          const sessionStart = new Date();
          sessionStart.setDate(sessionStart.getDate() - (s * 3 + 1));
          const sessionQuestions = questions.slice(s * 10, s * 10 + 10);
          if (sessionQuestions.length === 0) break;

          const avgDiff =
            sessionQuestions.reduce((sum, q) => sum + q.difficulty, 0) /
            sessionQuestions.length;

          const session = await prisma.quizSession.create({
            data: {
              userId: user.id,
              format: "QA",
              subjectsSelected: JSON.stringify(SUBJECTS),
              totalQuestions: sessionQuestions.length,
              correctCount: 0,
              avgDifficulty: avgDiff,
              startedAt: sessionStart,
              completedAt: new Date(sessionStart.getTime() + 20 * 60 * 1000),
            },
          });

          let correct = 0;
          for (const q of sessionQuestions) {
            const isCorrect = Math.random() > 0.35;
            if (isCorrect) correct++;
            await prisma.quizAnswer.create({
              data: {
                quizSessionId: session.id,
                questionId: q.id,
                userAnswer: isCorrect ? q.correctAnswer : "wrong",
                isCorrect,
              },
            });
          }

          await prisma.quizSession.update({
            where: { id: session.id },
            data: { correctCount: correct },
          });
        }
      }
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Create test student error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
