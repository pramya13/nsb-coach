"use client";

import { useState, useEffect, useCallback } from "react";

interface Student {
  id: string;
  name: string;
}

interface TestEntry {
  id: string;
  testDate: string;
  score: number;
  total: number;
  percentAccuracy: number;
  notes: string | null;
  user: { name: string };
}

interface BulkRow {
  studentId: string;
  score: string;
  total: string;
  notes: string;
}

export default function CoachTestsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<TestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bulkMode, setBulkMode] = useState(false);

  // Single entry form
  const [studentId, setStudentId] = useState("");
  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [score, setScore] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");

  // Bulk entry
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { studentId: "", score: "", total: "", notes: "" },
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [studentsRes, testsRes] = await Promise.all([
      fetch("/api/students"),
      fetch("/api/tests"),
    ]);
    if (studentsRes.ok) setStudents(await studentsRes.json());
    if (testsRes.ok) setTests(await testsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: studentId,
        testDate,
        score: Number(score),
        total: Number(total),
        notes: notes || null,
      }),
    });

    if (res.ok) {
      setSuccess("Test score saved!");
      setStudentId("");
      setScore("");
      setTotal("");
      setNotes("");
      fetchData();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const validRows = bulkRows.filter(
      (r) => r.studentId && r.score && r.total
    );

    if (validRows.length === 0) {
      setError("No valid entries to save");
      setSaving(false);
      return;
    }

    const results = await Promise.all(
      validRows.map((r) =>
        fetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: r.studentId,
            testDate: bulkDate,
            score: Number(r.score),
            total: Number(r.total),
            notes: r.notes || null,
          }),
        })
      )
    );

    const allOk = results.every((r) => r.ok);

    if (allOk) {
      setSuccess(`${validRows.length} test score(s) saved!`);
      setBulkRows([{ studentId: "", score: "", total: "", notes: "" }]);
      fetchData();
    } else {
      setError("Some entries failed to save");
    }
    setSaving(false);
  };

  const addBulkRow= () => {
    setBulkRows([
      ...bulkRows,
      { studentId: "", score: "", total: "", notes: "" },
    ]);
  };

  const updateBulkRow = (
    index: number,
    field: keyof BulkRow,
    value: string
  ) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRows(updated);
  };

  const removeBulkRow = (index: number) => {
    if (bulkRows.length <= 1) return;
    setBulkRows(bulkRows.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Tests</h1>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {bulkMode ? "Single Entry" : "Bulk Entry"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Entry Form */}
      {!bulkMode ? (
        <form
          onSubmit={handleSingleSubmit}
          className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Enter Test Score
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                Test Date
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Score
              </label>
              <input
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Total
              </label>
              <input
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional notes"
            />
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#0078d4] px-6 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Score"}
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleBulkSubmit}
          className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Bulk Entry
          </h2>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Test Date (for all entries)
            </label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              required
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-3">
            {bulkRows.map((row, i) => (
              <div
                key={i}
                className="flex flex-wrap items-end gap-3 rounded-md bg-gray-50 p-3"
              >
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Student
                  </label>
                  <select
                    value={row.studentId}
                    onChange={(e) =>
                      updateBulkRow(i, "studentId", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={row.score}
                    onChange={(e) =>
                      updateBulkRow(i, "score", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Total
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={row.total}
                    onChange={(e) =>
                      updateBulkRow(i, "total", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="min-w-[120px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) =>
                      updateBulkRow(i, "notes", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBulkRow(i)}
                  className="rounded-md px-2 py-1.5 text-sm text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={addBulkRow}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Row
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#0078d4] px-6 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </form>
      )}

      {/* Past Tests Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Past Test Entries
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Accuracy</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{t.user.name}</td>
                  <td className="px-6 py-3">
                    {new Date(t.testDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    {t.score}/{t.total}
                  </td>
                  <td className="px-6 py-3">
                    {Math.round(t.percentAccuracy * 10) / 10}%
                  </td>
                  <td className="px-6 py-3">{t.notes || "—"}</td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No test entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
