"use client";

import { useState, useEffect, useCallback } from "react";

interface InviteCode {
  id: string;
  code: string;
  targetRole: string;
  expiresAt: string | null;
  usedBy: string | null;
  createdAt: string;
  creator: { name: string; email: string };
  usedUser: { name: string; email: string } | null;
}

function getStatus(code: InviteCode): { label: string; color: string } {
  if (code.usedBy) return { label: "Used", color: "bg-gray-100 text-gray-700" };
  if (code.expiresAt && new Date(code.expiresAt) < new Date())
    return { label: "Expired", color: "bg-red-100 text-red-700" };
  return { label: "Available", color: "bg-green-100 text-green-700" };
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState("STUDENT");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    const res = await fetch("/api/admin/invite-codes");
    if (res.ok) setCodes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRole,
        expiresAt: expiresAt || null,
      }),
    });
    if (res.ok) {
      setExpiresAt("");
      fetchCodes();
    }
    setCreating(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Invite Codes</h1>

      {/* Create form */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Generate New Code
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            >
              <option value="STUDENT">Student</option>
              <option value="COACH">Coach</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expiration (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#006abc] disabled:opacity-50"
          >
            {creating ? "Creating..." : "Generate Code"}
          </button>
        </form>
      </div>

      {/* Codes table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {codes.length === 0 ? (
          <p className="p-6 text-gray-500">No invite codes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-6 py-3 font-medium">Code</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Used By</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => {
                  const status = getStatus(code);
                  return (
                    <tr
                      key={code.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-mono text-gray-900">
                        {code.code}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {code.targetRole}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {code.usedUser?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyCode(code.code)}
                          className="text-sm font-medium text-[#0078d4] hover:text-[#006abc]"
                        >
                          {copied === code.code ? "Copied!" : "Copy"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
