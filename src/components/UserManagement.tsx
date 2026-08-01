import React, { useState, useEffect } from "react";
import { User } from "../types";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  Smartphone,
  SmartphoneOff,
  User as UserIcon,
  X,
  Check,
  AlertCircle
} from "lucide-react";

interface UserManagementProps {
  onLog: (type: "info" | "success" | "warning" | "error", msg: string, details?: string) => void;
}

export default function UserManagement({ onLog }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New User Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    mobileAccess: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        onLog("error", "Failed to fetch users", `Status: ${res.status}`);
      }
    } catch (err: any) {
      onLog("error", "Error fetching users", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
        setFormData({ name: "", username: "", password: "", mobileAccess: false });
        setShowAddForm(false);
        onLog("success", `User "${formData.username}" created successfully.`);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create user");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === "admin") {
      onLog("warning", "Protected User", "The system admin account cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        onLog("success", `User "${username}" has been deleted.`);
      } else {
        onLog("error", "Failed to delete user");
      }
    } catch (err: any) {
      onLog("error", "Error deleting user", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          Access & User Management
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
            showAddForm
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
          }`}
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showAddForm ? "Cancel" : "Add New User"}
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-[#111216] border border-indigo-500/20 rounded-2xl p-6 shadow-xl animate-fade-in">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  placeholder="e.g. johndoe"
                  className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, mobileAccess: !formData.mobileAccess})}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all flex-1 ${
                    formData.mobileAccess
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800/50 border-white/5 text-slate-500"
                  }`}
                >
                  {formData.mobileAccess ? <Smartphone className="w-4 h-4" /> : <SmartphoneOff className="w-4 h-4" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mobile App Access</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-[#111216] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#161a22] border-b border-[#1e222b]">
                <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">User</th>
                <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Privileges</th>
                <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e222b]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-20" />
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-xs">
                    No users found in database.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                        user.role === "admin"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : "bg-slate-800 text-slate-400 border-white/5"
                      }`}>
                        {user.role === "admin" ? <ShieldCheck className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                        {user.role}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight ${
                        user.mobileAccess
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-900 text-slate-600 border border-white/5"
                      }`}>
                        {user.mobileAccess ? <Smartphone className="w-3 h-3" /> : <SmartphoneOff className="w-3 h-3" />}
                        {user.mobileAccess ? "Jerry Mobile Active" : "No Mobile Access"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {user.username !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
