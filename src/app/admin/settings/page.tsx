"use client";

import { useState, useEffect, useCallback } from "react";

interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

const DEFAULT_SETTINGS = [
  { key: "default_quiz_format", label: "Default Quiz Format", type: "text" },
  { key: "quiz_timer_enabled", label: "Quiz Timer Enabled", type: "boolean" },
  { key: "quiz_timer_seconds", label: "Quiz Timer (seconds)", type: "number" },
  { key: "default_quiz_length", label: "Default Quiz Length", type: "number" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data: AppSetting[] = await res.json();
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
      setEditValues(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(key: string) {
    setSaving(key);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: editValues[key] ?? "" }),
    });
    if (res.ok) {
      setSettings((prev) => ({ ...prev, [key]: editValues[key] ?? "" }));
    }
    setSaving(null);
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-4">
        {DEFAULT_SETTINGS.map((setting) => (
          <div
            key={setting.key}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {setting.label}
                </label>
                {setting.type === "boolean" ? (
                  <select
                    value={editValues[setting.key] ?? "false"}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <input
                    type={setting.type}
                    value={editValues[setting.key] ?? ""}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                    className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  />
                )}
                {settings[setting.key] !== undefined && (
                  <p className="mt-1 text-xs text-gray-400">
                    Current: {settings[setting.key]}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleSave(setting.key)}
                disabled={
                  saving === setting.key ||
                  editValues[setting.key] === settings[setting.key]
                }
                className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
              >
                {saving === setting.key ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
