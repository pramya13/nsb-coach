"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StudentChartsProps {
  studyData: { date: string; difficulty: number }[];
  quizData: { date: string; accuracy: number }[];
  testData: { date: string; accuracy: number }[];
}

export default function StudentCharts({
  studyData,
  quizData,
  testData,
}: StudentChartsProps) {
  // Merge quiz and test data by date for dual-line chart
  const accuracyMap = new Map<
    string,
    { date: string; quizAccuracy?: number; testAccuracy?: number }
  >();

  for (const q of quizData) {
    const entry = accuracyMap.get(q.date) || { date: q.date };
    entry.quizAccuracy = q.accuracy;
    accuracyMap.set(q.date, entry);
  }
  for (const t of testData) {
    const entry = accuracyMap.get(t.date) || { date: t.date };
    entry.testAccuracy = t.accuracy;
    accuracyMap.set(t.date, entry);
  }

  const accuracyData = Array.from(accuracyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const noStudyData = studyData.length === 0;
  const noAccuracyData = accuracyData.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Study Difficulty Over Time */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          Study Difficulty Over Time
        </h3>
        {noStudyData ? (
          <p className="py-12 text-center text-sm text-gray-400">
            No study data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={studyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="difficulty"
                stroke="#0078d4"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Self-Rated Difficulty"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quiz + Monthly Test Accuracy */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          Quiz & Monthly Test Accuracy
        </h3>
        {noAccuracyData ? (
          <p className="py-12 text-center text-sm text-gray-400">
            No accuracy data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="quizAccuracy"
                stroke="#0078d4"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Quiz Accuracy"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="testAccuracy"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Monthly Test"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
