"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
const ANSWER_FORMATS = ["MULTIPLE_CHOICE", "SHORT_ANSWER"];

const emptyForm = {
  subject: "LIFE_SCIENCE",
  topic: "",
  difficulty: 4,
  questionType: "TOSS_UP",
  answerFormat: "MULTIPLE_CHOICE",
  questionText: "",
  choices: "",
  correctAnswer: "",
  sourceSet: "",
  sourceRound: "",
};

export default function CoachQuestionsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSubject) params.set("subject", filterSubject);
    if (filterType) params.set("type", filterType);
    const res = await fetch(`/api/questions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data);
    }
    setLoading(false);
  }, [filterSubject, filterType]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      difficulty: Number(form.difficulty),
      sourceSet: form.sourceSet ? Number(form.sourceSet) : null,
      sourceRound: form.sourceRound ? Number(form.sourceRound) : null,
      choices: form.choices || null,
    };

    const url = editingId ? `/api/questions/${editingId}` : "/api/questions";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchQuestions();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save question");
    }
    setSaving(false);
  };

  const handleEdit = (q: Question) => {
    setForm({
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      questionType: q.questionType,
      answerFormat: q.answerFormat,
      questionText: q.questionText,
      choices: q.choices || "",
      correctAnswer: q.correctAnswer,
      sourceSet: q.sourceSet?.toString() || "",
      sourceRound: q.sourceRound?.toString() || "",
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) fetchQuestions();
    else {
      const data = await res.json();
      setError(data.error || "Failed to delete");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc]"
        >
          {showForm ? "Cancel" : "+ Add Question"}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Question" : "New Question"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subject
              </label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Difficulty (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: Number(e.target.value) })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Question Type
              </label>
              <select
                value={form.questionType}
                onChange={(e) =>
                  setForm({ ...form, questionType: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Answer Format
              </label>
              <select
                value={form.answerFormat}
                onChange={(e) =>
                  setForm({ ...form, answerFormat: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {ANSWER_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Source Set
              </label>
              <input
                type="number"
                value={form.sourceSet}
                onChange={(e) =>
                  setForm({ ...form, sourceSet: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Source Round
              </label>
              <input
                type="number"
                value={form.sourceRound}
                onChange={(e) =>
                  setForm({ ...form, sourceRound: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <textarea
              value={form.questionText}
              onChange={(e) =>
                setForm({ ...form, questionText: e.target.value })
              }
              rows={3}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Choices (JSON array, e.g. [&quot;W) ...&quot;, &quot;X) ...&quot;])
            </label>
            <input
              type="text"
              value={form.choices}
              onChange={(e) => setForm({ ...form, choices: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder='Optional for short answer'
            />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Correct Answer
            </label>
            <input
              type="text"
              value={form.correctAnswer}
              onChange={(e) =>
                setForm({ ...form, correctAnswer: e.target.value })
              }
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#0078d4] px-6 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Question"
                  : "Add Question"}
            </button>
          </div>
        </form>
      )}

      {/* Questions Table */}
      {loading ? (
        <p className="text-gray-500">Loading questions...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Diff</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Answer</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q.subject.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q.questionType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">{q.difficulty}</td>
                    <td className="max-w-xs truncate px-4 py-3">
                      {q.questionText}
                    </td>
                    <td className="px-4 py-3">{q.correctAnswer}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(q)}
                          className="text-[#0078d4] hover:underline"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
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
        </div>
      )}
    </div>
  );
}
