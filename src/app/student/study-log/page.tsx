"use client";

import { useState, useEffect, useCallback } from "react";

const SUBJECTS = [
  "LIFE_SCIENCE",
  "EARTH_SPACE",
  "PHYSICAL_SCIENCE",
  "MATH",
  "ENERGY",
];

const subjectLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

interface StudyLog {
  id: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  timeSpentMin: number;
  selfDifficulty: number;
  isReview: boolean;
  notes: string | null;
  studyDate: string;
}

export default function StudyLogPage() {
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [timeSpentMin, setTimeSpentMin] = useState(30);
  const [selfDifficulty, setSelfDifficulty] = useState(3);
  const [isReview, setIsReview] = useState(false);
  const [notes, setNotes] = useState("");
  const [studyDate, setStudyDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study-logs?page=${page}&limit=10`);
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      console.error("Failed to fetch study logs");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/study-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          subtopic: subtopic || undefined,
          timeSpentMin,
          selfDifficulty,
          isReview,
          notes: notes || undefined,
          studyDate,
        }),
      });
      if (res.ok) {
        setTopic("");
        setSubtopic("");
        setTimeSpentMin(30);
        setSelfDifficulty(3);
        setIsReview(false);
        setNotes("");
        setStudyDate(new Date().toISOString().split("T")[0]);
        setPage(1);
        fetchLogs();
      }
    } catch {
      console.error("Failed to submit study log");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Study Log</h1>

      {/* Add Study Log Form */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Log a Study Session
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subject *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {subjectLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="e.g., Cell Biology"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            {/* Subtopic */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subtopic
              </label>
              <input
                type="text"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder="e.g., Mitosis"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            {/* Time spent */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Time Spent (minutes) *
              </label>
              <input
                type="number"
                min={1}
                value={timeSpentMin}
                onChange={(e) => setTimeSpentMin(parseInt(e.target.value, 10) || 0)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>

            {/* Self difficulty */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Difficulty (1-5) *
              </label>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelfDifficulty(n)}
                    className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                      selfDifficulty >= n
                        ? "bg-[#0078d4] text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Study date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Study Date *
              </label>
              <input
                type="date"
                value={studyDate}
                onChange={(e) => setStudyDate(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>

          {/* Is review checkbox */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isReview}
              onChange={(e) => setIsReview(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
            />
            This is a review session
          </label>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this session..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#0078d4] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006abc] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Save Study Log"}
          </button>
        </form>
      </div>

      {/* Study Logs Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Past Study Logs
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No study logs yet. Log your first session above!
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Topic</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Difficulty</th>
                    <th className="px-6 py-3">Review</th>
                    <th className="px-6 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-3 text-gray-900">
                        {new Date(log.studyDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {subjectLabel(log.subject)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {log.topic}
                        {log.subtopic && (
                          <span className="text-gray-400">
                            {" "}
                            · {log.subtopic}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {log.timeSpentMin} min
                      </td>
                      <td className="px-6 py-3">
                        {"★".repeat(log.selfDifficulty)}
                        {"☆".repeat(5 - log.selfDifficulty)}
                      </td>
                      <td className="px-6 py-3">
                        {log.isReview ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-3 text-gray-500">
                        {log.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
