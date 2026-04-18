"use client";

import { useState, useEffect, useCallback } from "react";

interface Student {
  id: string;
  name: string;
}

interface MonthlyTest {
  id: string;
  userId: string;
  testDate: string;
  score: number;
  total: number;
  percentAccuracy: number;
  notes: string | null;
  createdAt: string;
  user: { name: string; email: string };
  enteredByUser: { name: string };
}

export default function TestsPage() {
  const [tests, setTests] = useState<MonthlyTest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    testDate: "",
    score: "",
    total: "",
    notes: "",
  });

  const fetchTests = useCallback(async () => {
    const res = await fetch("/api/tests");
    if (res.ok) setTests(await res.json());
    setLoading(false);
  }, []);

  const fetchStudents = useCallback(async () => {
    const res = await fetch("/api/students");
    if (res.ok) {
      const data = await res.json();
      setStudents(data);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchStudents();
  }, [fetchTests, fetchStudents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm({ userId: "", testDate: "", score: "", total: "", notes: "" });
      setShowForm(false);
      fetchTests();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Tests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc]"
        >
          {showForm ? "Cancel" : "Add Test Score"}
        </button>
      </div>

      {/* Add test form */}
      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Record Test Score
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Student *
                </label>
                <select
                  value={form.userId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, userId: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Test Date *
                </label>
                <input
                  type="date"
                  value={form.testDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, testDate: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Score *
                </label>
                <input
                  type="number"
                  value={form.score}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, score: e.target.value }))
                  }
                  required
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Total *
                </label>
                <input
                  type="number"
                  value={form.total}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, total: e.target.value }))
                  }
                  required
                  min="1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Test Score"}
            </button>
          </form>
        </div>
      )}

      {/* Tests table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {tests.length === 0 ? (
          <p className="p-6 text-gray-500">No test records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Accuracy</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  <th className="px-6 py-3 font-medium">Entered By</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr
                    key={test.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {test.user.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(test.testDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {test.score}/{test.total}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {Math.round(test.percentAccuracy * 10) / 10}%
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-gray-500">
                      {test.notes || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {test.enteredByUser.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
