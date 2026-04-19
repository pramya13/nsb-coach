"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SUBJECTS = [
  { value: "", label: "All Subjects" },
  { value: "MATH", label: "Math" },
  { value: "BIOLOGY", label: "Biology" },
  { value: "LIFE_SCIENCE", label: "Life Science" },
  { value: "CHEMISTRY", label: "Chemistry" },
  { value: "PHYSICS", label: "Physics" },
  { value: "PHYSICAL_SCIENCE", label: "Physical Science" },
  { value: "GENERAL_SCIENCE", label: "General Science" },
  { value: "ASTRONOMY", label: "Astronomy" },
  { value: "EARTH_SCIENCE", label: "Earth Science" },
  { value: "EARTH_AND_SPACE", label: "Earth & Space" },
  { value: "ENERGY", label: "Energy" },
];

interface DifficultyPoint {
  date: string;
  avgDifficulty: number;
}

interface AccuracyPoint {
  date: string;
  percent: number;
}

interface MonthlyTest {
  id: string;
  testDate: string;
  score: number;
  total: number;
  percentAccuracy: number;
  notes: string | null;
}

export default function ProgressPage() {
  const [subject, setSubject] = useState("");
  const [difficultyTrend, setDifficultyTrend] = useState<DifficultyPoint[]>([]);
  const [accuracyTrend, setAccuracyTrend] = useState<AccuracyPoint[]>([]);
  const [monthlyTests, setMonthlyTests] = useState<MonthlyTest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      const res = await fetch(`/api/progress?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDifficultyTrend(data.difficultyTrend);
        setAccuracyTrend(data.accuracyTrend);
        setMonthlyTests(data.monthlyTests);
      }
    } catch {
      console.error("Failed to fetch progress data");
    } finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4] sm:w-48"
        >
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">
          Loading progress data...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Study Difficulty Over Time */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Study Difficulty Over Time
            </h2>
            {difficultyTrend.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                No study data yet. Log some study sessions to see trends!
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={difficultyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    domain={[1, 5]}
                    fontSize={12}
                    tick={{ fill: "#6b7280" }}
                    label={{
                      value: "Difficulty",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#6b7280", fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgDifficulty"
                    name="Avg Self-Difficulty"
                    stroke="#0078d4"
                    strokeWidth={2}
                    dot={{ fill: "#0078d4", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quiz Accuracy Over Time */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Quiz Accuracy Over Time
            </h2>
            {accuracyTrend.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                No quiz data yet. Take some quizzes to see your accuracy trend!
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={accuracyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    fontSize={12}
                    tick={{ fill: "#6b7280" }}
                    label={{
                      value: "Accuracy %",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#6b7280", fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value) => [`${value}%`, "Accuracy"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    name="Quiz Accuracy"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: "#16a34a", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Test Scores */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Monthly Test Scores
              </h2>
            </div>
            {monthlyTests.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No monthly test scores recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Accuracy</th>
                      <th className="px-6 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyTests.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-3 text-gray-900">
                          {new Date(test.testDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {test.score}/{test.total}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              test.percentAccuracy >= 80
                                ? "bg-green-100 text-green-700"
                                : test.percentAccuracy >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {Math.round(test.percentAccuracy)}%
                          </span>
                        </td>
                        <td className="max-w-[300px] truncate px-6 py-3 text-gray-500">
                          {test.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
