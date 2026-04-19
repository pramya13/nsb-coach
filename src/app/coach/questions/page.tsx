"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  questionType: string;
  answerFormat: string;
  questionText: string;
  choices: string | null;
  correctAnswer: string;
  sourceSet: number | null;
  sourceRound: number | null;
  source: string | null;
  createdAt: string;
}

const SUBJECTS = [
  "LIFE_SCIENCE",
  "EARTH_SPACE",
  "PHYSICAL_SCIENCE",
  "MATH",
  "ENERGY",
];
const QUESTION_TYPES = ["TOSS_UP", "BONUS"];
const PAGE_SIZE = 50;

export default function CoachQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterGrade, setFilterGrade] = useState<"ALL" | "MS" | "HS">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [filterSubject, filterType, filterSource, filterGrade]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject", filterSubject);
    if (filterType) params.set("type", filterType);
    if (filterSource) params.set("source", filterSource);
    if (filterGrade !== "ALL") params.set("grade", filterGrade);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/questions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [filterSubject, filterType, filterSource, filterGrade, search, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <p className="text-sm text-gray-500">Read-only view for coaches.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Subject
          </label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All Types</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Source
          </label>
          <input
            type="text"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            placeholder="Source (e.g. doe-hs)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Grade
          </label>
          <div className="flex gap-1">
            {(["ALL", "MS", "HS"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGrade(g)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  filterGrade === g
                    ? "border-[#0078d4] bg-[#0078d4] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {g === "ALL" ? "All" : g}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Search
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search text, answer, topic..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none"
          />
        </div>
      </div>

      {/* Questions Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-600">
            {loading
              ? "Loading..."
              : total === 0
                ? "No questions found."
                : `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
        {loading && questions.length === 0 ? (
          <p className="p-6 text-gray-500">Loading questions...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Diff</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Answer</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {q.subject.replace(/_/g, " ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {q.questionType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">{q.difficulty}</td>
                    <td className="max-w-xs truncate px-4 py-3">
                      {q.questionText}
                    </td>
                    <td className="px-4 py-3">{q.correctAnswer}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {q.source || "—"}
                    </td>
                  </tr>
                ))}
                {!loading && questions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No questions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
