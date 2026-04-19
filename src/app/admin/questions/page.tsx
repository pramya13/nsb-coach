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

const PAGE_SIZE = 50;

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subject: "LIFE_SCIENCE",
    topic: "",
    difficulty: "4",
    questionType: "TOSS_UP",
    answerFormat: "MULTIPLE_CHOICE",
    questionText: "",
    choices: "",
    correctAnswer: "",
  });

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
  }, [filterSubject, filterDifficulty, filterType, filterSource]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject", filterSubject);
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    if (filterType) params.set("type", filterType);
    if (filterSource) params.set("source", filterSource);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/questions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [filterSubject, filterDifficulty, filterType, filterSource, search, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  function resetForm() {
    setForm({
      subject: "LIFE_SCIENCE",
      topic: "",
      difficulty: "4",
      questionType: "TOSS_UP",
      answerFormat: "MULTIPLE_CHOICE",
      questionText: "",
      choices: "",
      correctAnswer: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(q: Question) {
    setForm({
      subject: q.subject,
      topic: q.topic,
      difficulty: String(q.difficulty),
      questionType: q.questionType,
      answerFormat: q.answerFormat,
      questionText: q.questionText,
      choices: q.choices || "",
      correctAnswer: q.correctAnswer,
    });
    setEditingId(q.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let parsedChoices: string[] | null = null;
    if (form.choices.trim()) {
      try {
        parsedChoices = JSON.parse(form.choices);
      } catch {
        parsedChoices = form.choices.split(",").map((c) => c.trim());
      }
    }

    const payload = {
      subject: form.subject,
      topic: form.topic,
      difficulty: form.difficulty,
      questionType: form.questionType,
      answerFormat: form.answerFormat,
      questionText: form.questionText,
      choices: parsedChoices,
      correctAnswer: form.correctAnswer,
    };

    if (editingId) {
      const res = await fetch(`/api/questions/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
        fetchQuestions();
      }
    } else {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
        fetchQuestions();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) fetchQuestions();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc]"
        >
          {showForm ? "Cancel" : "Add Question"}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Subject
          </label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Difficulty
          </label>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
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
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0078d4] focus:outline-none"
          >
            <option value="">All</option>
            <option value="TOSS_UP">Toss-Up</option>
            <option value="BONUS">Bonus</option>
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
            placeholder="e.g. doe-hs"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0078d4] focus:outline-none"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Search
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search text, answer, topic..."
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0078d4] focus:outline-none"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Question" : "Add Question"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject *
                </label>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Topic
                </label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, topic: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Difficulty (1-5)
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, difficulty: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Question Type
                </label>
                <select
                  value={form.questionType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, questionType: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  <option value="TOSS_UP">Toss-Up</option>
                  <option value="BONUS">Bonus</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Answer Format
                </label>
                <select
                  value={form.answerFormat}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, answerFormat: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Correct Answer *
                </label>
                <input
                  type="text"
                  value={form.correctAnswer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, correctAnswer: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Question Text *
              </label>
              <textarea
                value={form.questionText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, questionText: e.target.value }))
                }
                required
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Choices (JSON array, e.g. {`["W) opt1","X) opt2","Y) opt3","Z) opt4"]`})
              </label>
              <input
                type="text"
                value={form.choices}
                onChange={(e) =>
                  setForm((f) => ({ ...f, choices: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Question"
                    : "Add Question"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
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
          <p className="p-6 text-gray-500">Loading...</p>
        ) : questions.length === 0 ? (
          <p className="p-6 text-gray-500">No questions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Topic</th>
                  <th className="px-6 py-3 font-medium">Diff</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Question</th>
                  <th className="px-6 py-3 font-medium">Answer</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-3 text-gray-900">
                      {q.subject.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{q.topic || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{q.difficulty}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {q.questionType === "TOSS_UP" ? "TU" : "B"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-gray-900">
                      {q.questionText}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {q.correctAnswer}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(q)}
                          className="text-sm font-medium text-[#0078d4] hover:text-[#006abc]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3">
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
