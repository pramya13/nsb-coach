"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SUBJECTS = [
  "MATH",
  "BIOLOGY",
  "LIFE_SCIENCE",
  "CHEMISTRY",
  "PHYSICS",
  "PHYSICAL_SCIENCE",
  "GENERAL_SCIENCE",
  "ASTRONOMY",
  "EARTH_SCIENCE",
  "EARTH_AND_SPACE",
  "ENERGY",
];
const QUESTION_COUNTS = [5, 10, 15, 20, 25];

const subjectLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

interface QuizQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  questionType: string;
  answerFormat: string;
  questionText: string;
  choices: string[] | null;
}

interface SubjectBreakdown {
  subject: string;
  correct: number;
  total: number;
  percent: number;
}

type QuizMode = "setup" | "active" | "completed";

export default function QuizPage() {
  const [mode, setMode] = useState<QuizMode>("setup");

  // Setup state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [format, setFormat] = useState("QA");
  const [starting, setStarting] = useState(false);

  // Active quiz state
  const [quizSessionId, setQuizSessionId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctTotal, setCorrectTotal] = useState(0);

  // NSB timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [buzzedIn, setBuzzedIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Completion state
  const [finalStats, setFinalStats] = useState<{
    correctCount: number;
    totalQuestions: number;
    percent: number;
    subjectBreakdown: SubjectBreakdown[];
  } | null>(null);

  // Load default format from settings
  useEffect(() => {
    // Best-effort: try to fetch default format setting
    fetch("/api/settings?key=default_quiz_format")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.value) setFormat(data.value);
      })
      .catch(() => {});
  }, []);

  // Timer effect for NSB mode
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const startQuiz = async () => {
    if (selectedSubjects.length === 0) return;
    setStarting(true);
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: selectedSubjects,
          totalQuestions: questionCount,
          format,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to start quiz");
        return;
      }
      const data = await res.json();
      setQuizSessionId(data.quizSessionId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setCorrectTotal(0);
      setUserAnswer("");
      setSubmittedAnswer(null);
      setMode("active");

      // Start timer for NSB mode
      if (format === "NSB" && data.questions.length > 0) {
        startNSBTimer(data.questions[0]);
      }
    } catch {
      alert("Failed to start quiz");
    } finally {
      setStarting(false);
    }
  };

  const startNSBTimer = (question: QuizQuestion) => {
    const seconds = question.questionType === "TOSS_UP" ? 5 : 20;
    setTimeLeft(seconds);
    setTimerActive(true);
    setBuzzedIn(false);
  };

  const handleBuzzIn = () => {
    setBuzzedIn(true);
    setTimerActive(false);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() && !submittedAnswer) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizSessionId,
          questionId: questions[currentIndex].id,
          userAnswer: userAnswer.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to submit answer");
        return;
      }
      const data = await res.json();
      setSubmittedAnswer(data);
      if (data.isCorrect) setCorrectTotal((c) => c + 1);
      setTimerActive(false);
    } catch {
      alert("Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      completeQuiz();
      return;
    }
    setCurrentIndex(nextIdx);
    setUserAnswer("");
    setSubmittedAnswer(null);

    if (format === "NSB") {
      startNSBTimer(questions[nextIdx]);
    }
  };

  const completeQuiz = useCallback(async () => {
    try {
      const res = await fetch("/api/quiz/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizSessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFinalStats(data);
      }
    } catch {
      console.error("Failed to complete quiz");
    }
    setMode("completed");
  }, [quizSessionId]);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // ─── SETUP MODE ──────────────────────────────────────────────
  if (mode === "setup") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Start a Quiz</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {/* Subject selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select Subjects
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedSubjects.includes(s)
                      ? "bg-[#0078d4] text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {subjectLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Number of questions */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    questionCount === n
                      ? "bg-[#0078d4] text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Format
            </label>
            <div className="flex gap-2">
              {["QA", "NSB"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    format === f
                      ? "bg-[#0078d4] text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {f === "QA" ? "Q&A" : "NSB (Timed)"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={selectedSubjects.length === 0 || starting}
            className="w-full rounded-lg bg-[#0078d4] px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#006abc] disabled:opacity-50 transition-colors"
          >
            {starting ? "Loading Questions..." : "Start Quiz"}
          </button>
        </div>
      </div>
    );
  }

  // ─── COMPLETED MODE ──────────────────────────────────────────
  if (mode === "completed") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Quiz Complete! 🎉
          </h1>
          {finalStats && (
            <>
              <div className="my-6">
                <p className="text-5xl font-bold text-[#0078d4]">
                  {finalStats.percent}%
                </p>
                <p className="mt-1 text-gray-500">
                  {finalStats.correctCount} / {finalStats.totalQuestions} correct
                </p>
              </div>

              {/* Subject breakdown */}
              {finalStats.subjectBreakdown.length > 0 && (
                <div className="mx-auto mt-6 max-w-md text-left">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">
                    Performance by Subject
                  </h3>
                  <div className="space-y-2">
                    {finalStats.subjectBreakdown.map((sb) => (
                      <div key={sb.subject}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {subjectLabel(sb.subject)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {sb.correct}/{sb.total} ({sb.percent}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-[#0078d4] transition-all"
                            style={{ width: `${sb.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => {
                setMode("setup");
                setFinalStats(null);
              }}
              className="rounded-lg bg-[#0078d4] px-5 py-2 text-sm font-medium text-white hover:bg-[#006abc] transition-colors"
            >
              Take Another Quiz
            </button>
            <a
              href="/student/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE QUIZ MODE ────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-sm text-gray-500">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>
            {correctTotal} correct so far
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-[#0078d4] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Question header */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
              {subjectLabel(currentQuestion.subject)}
            </span>
            <span className="text-sm text-yellow-500">
              {"★".repeat(currentQuestion.difficulty)}
              {"☆".repeat(5 - currentQuestion.difficulty)}
            </span>
            {format === "NSB" && (
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                  currentQuestion.questionType === "TOSS_UP"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {currentQuestion.questionType === "TOSS_UP"
                  ? "TOSS-UP"
                  : "BONUS"}
              </span>
            )}
          </div>

          {/* NSB Timer */}
          {format === "NSB" && (
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl font-bold ${
                    timeLeft <= 3 && timeLeft > 0
                      ? "text-red-500"
                      : "text-gray-700"
                  }`}
                >
                  {timeLeft}s
                </div>
                <div className="flex-1 h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      timeLeft <= 3 ? "bg-red-500" : "bg-green-500"
                    }`}
                    style={{
                      width: `${
                        (timeLeft /
                          (currentQuestion.questionType === "TOSS_UP"
                            ? 5
                            : 20)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {currentQuestion.questionType === "TOSS_UP" &&
                !buzzedIn &&
                !submittedAnswer && (
                  <button
                    onClick={handleBuzzIn}
                    disabled={timeLeft === 0}
                    className="mt-2 w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    🔔 BUZZ IN!
                  </button>
                )}
            </div>
          )}

          {/* Question text */}
          <p className="mb-6 text-lg text-gray-900">
            {currentQuestion.questionText}
          </p>

          {/* Answer input */}
          {(format === "QA" ||
            (format === "NSB" &&
              (buzzedIn ||
                currentQuestion.questionType === "BONUS"))) && (
            <div className="space-y-3">
              {currentQuestion.answerFormat === "MULTIPLE_CHOICE" &&
              currentQuestion.choices ? (
                <div className="space-y-2">
                  {currentQuestion.choices.map((choice: string, i: number) => {
                    const letter = choice.charAt(0);
                    const isSelected = userAnswer === letter;
                    const isSubmitted = !!submittedAnswer;
                    const isCorrectChoice =
                      isSubmitted &&
                      submittedAnswer.correctAnswer === letter;
                    const isWrongSelected =
                      isSubmitted && isSelected && !submittedAnswer.isCorrect;

                    return (
                      <label
                        key={i}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                          isSubmitted
                            ? isCorrectChoice
                              ? "border-green-500 bg-green-50"
                              : isWrongSelected
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200"
                            : isSelected
                              ? "border-[#0078d4] bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={letter}
                          checked={isSelected}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          disabled={!!submittedAnswer}
                          className="h-4 w-4 text-[#0078d4]"
                        />
                        <span className="text-gray-800">{choice}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={!!submittedAnswer}
                  placeholder="Type your answer..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submittedAnswer) submitAnswer();
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] disabled:bg-gray-50"
                />
              )}

              {/* Result feedback */}
              {submittedAnswer && (
                <div
                  className={`rounded-lg p-3 text-sm font-medium ${
                    submittedAnswer.isCorrect
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {submittedAnswer.isCorrect
                    ? "✓ Correct!"
                    : `✗ Incorrect. The correct answer is: ${submittedAnswer.correctAnswer}`}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {!submittedAnswer ? (
                  <button
                    onClick={submitAnswer}
                    disabled={!userAnswer.trim() || submitting}
                    className="rounded-lg bg-[#0078d4] px-5 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "Checking..." : "Submit Answer"}
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="rounded-lg bg-[#0078d4] px-5 py-2 text-sm font-medium text-white hover:bg-[#006abc] transition-colors"
                  >
                    {currentIndex + 1 >= questions.length
                      ? "Finish Quiz"
                      : "Next Question →"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* NSB: Timer expired without buzzing in */}
          {format === "NSB" &&
            timeLeft === 0 &&
            !buzzedIn &&
            !submittedAnswer &&
            currentQuestion.questionType === "TOSS_UP" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-yellow-50 p-3 text-sm font-medium text-yellow-700">
                  ⏰ Time&apos;s up! You didn&apos;t buzz in.
                </div>
                <button
                  onClick={() => {
                    // Submit empty answer (missed)
                    fetch("/api/quiz/answer", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        quizSessionId,
                        questionId: currentQuestion.id,
                        userAnswer: "",
                      }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        setSubmittedAnswer(data);
                      });
                  }}
                  className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                  See Answer & Continue
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
