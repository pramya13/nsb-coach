"use client";

import { useState, useEffect, useCallback } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count: {
    studyLogs: number;
    quizSessions: number;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("test1234");
  const [seedData, setSeedData] = useState(true);

  const fetchStudents = useCallback(async () => {
    const res = await fetch("/api/students");
    if (res.ok) setStudents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/admin/test-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, seedData }),
    });

    const data = await res.json();
    if (res.ok) {
      setSuccess(
        `Test student "${name}" created${seedData ? " with sample data" : ""}.`
      );
      setName("");
      setEmail("");
      setPassword("test1234");
      setSeedData(true);
      setShowForm(false);
      fetchStudents();
    } else {
      setError(data.error || "Failed to create student.");
    }
    setSubmitting(false);
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
            setSuccess(null);
          }}
          className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc]"
        >
          {showForm ? "Cancel" : "+ Add Test Student"}
        </button>
      </div>

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Create Test Student
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Bypasses invite code flow. Use this to create accounts for testing
            the platform.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Test Student 1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test1@nsbcoach.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={seedData}
                    onChange={(e) => setSeedData(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Seed with sample study logs &amp; quiz history
                </label>
              </div>
            </div>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Student"}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {students.length === 0 ? (
          <p className="p-6 text-gray-500">No students registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Study Logs</th>
                  <th className="px-6 py-3 font-medium">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {student._count.studyLogs}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {student._count.quizSessions}
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
