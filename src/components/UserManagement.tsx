import React, { useState, useEffect } from "react";
import { User, Device } from "../types";
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
  AlertCircle,
  Lock,
  RefreshCw,
  Save,
  Settings,
  Key,
  Layout
} from "lucide-react";

interface UserManagementProps {
  onLog: (type: "info" | "success" | "warning" | "error", msg: string, details?: string) => void;
  allDevices: Device[];
}

export default function UserManagement({ onLog, allDevices }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Dashboard Config Password State
  const [configPassword, setConfigPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Controller Password State
  const [ctrlPassword, setCtrlPassword] = useState("");
  const [isSavingCtrlPassword, setIsSavingCtrlPassword] = useState(false);

  // New User Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    mobileAccess: true,
    allowed_pages: ["dashboard", "shopping"]
  });

  // Password Change State
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchConfigPassword();
    fetchControllerPassword();
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

  const fetchConfigPassword = async () => {
    try {
      const res = await fetch("/api/admin/config-password");
      if (res.ok) {
        const data = await res.json();
        setConfigPassword(data.password || "");
      }
    } catch (err: any) {
      console.error("Failed to fetch config password", err);
    }
  };

  const fetchControllerPassword = async () => {
    try {
      const res = await fetch("/api/admin/controller-password");
      if (res.ok) {
        const data = await res.json();
        setCtrlPassword(data.password || "");
      }
    } catch (err: any) {
      console.error("Failed to fetch controller password", err);
    }
  };

  const handleSaveConfigPassword = async () => {
    if (!configPassword.trim()) {
      onLog("warning", "Password Required", "The configuration access password cannot be empty.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await fetch("/api/admin/config-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: configPassword }),
      });

      if (res.ok) {
        onLog("success", "Configuration access security updated successfully.");
      } else {
        onLog("error", "Failed to update configuration security");
      }
    } catch (err: any) {
      onLog("error", "Error saving config password", err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveCtrlPassword = async () => {
    if (!ctrlPassword.trim()) {
      onLog("warning", "Password Required", "The controller access password cannot be empty.");
      return;
    }
    setIsSavingCtrlPassword(true);
    try {
      const res = await fetch("/api/admin/controller-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: ctrlPassword }),
      });

      if (res.ok) {
        onLog("success", "Controller access security updated successfully.");
      } else {
        onLog("error", "Failed to update controller security");
      }
    } catch (err: any) {
      onLog("error", "Error saving controller password", err.message);
    } finally {
      setIsSavingCtrlPassword(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Automation Logic: If dashboard is allowed, populate allowed_devices with all system device IDs
    const allowedDevices = formData.allowed_pages.includes("dashboard")
      ? allDevices.map(d => d.id)
      : [];

    const payload = {
      ...formData,
      allowed_devices: allowedDevices
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
        setFormData({
          name: "",
          username: "",
          password: "",
          mobileAccess: true,
          allowed_pages: ["dashboard", "shopping"]
        });
        setShowAddForm(false);
        onLog("success", `User "${formData.username}" created successfully with automated device access.`);
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

  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword.trim()) {
      onLog("warning", "Password required", "Please enter a new password.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setEditingPasswordUserId(null);
        setNewPassword("");
        onLog("success", "User password updated successfully.");
      } else {
        onLog("error", "Failed to update password");
      }
    } catch (err: any) {
      onLog("error", "Error updating password", err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const togglePagePrivilege = (page: string) => {
    setFormData(prev => {
      const current = prev.allowed_pages;
      if (current.includes(page)) {
        return { ...prev, allowed_pages: current.filter(p => p !== page) };
      } else {
        return { ...prev, allowed_pages: [...current, page] };
      }
    });
  };

  const AVAILABLE_PAGES = ["dashboard", "shopping", "settings"];

  return (
    <div className="space-y-12">

      {/* SECTION 1: MOBILE DEVICES */}
      <section className="space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Smartphone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">Mobile Devices</h2>
              <p className="text-[10px] text-slate-500 font-mono">AUTHORIZED USERS FOR JERRY_MOBILE_APP</p>
            </div>
          </div>
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
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Identity Info */}
                <div className="space-y-4 sm:col-span-2">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</span>
                  </div>
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
                      <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Initial Password</label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Privileges */}
                <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Allowed Pages</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_PAGES.map(page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => togglePagePrivilege(page)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          formData.allowed_pages.includes(page)
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/10"
                        }`}
                      >
                        <span>{page}</span>
                        {formData.allowed_pages.includes(page) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 italic mt-2">Granting 'dashboard' access auto-assigns all current system devices.</p>
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
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Register New User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[#111216] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161a22] border-b border-[#1e222b]">
                  <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Authorized User</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Privileges</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-slate-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-20" />
                      Syncing user database...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-slate-500 text-xs">
                      No registered users found.
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    const isEditingPassword = editingPasswordUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                              {user.role === "admin" ? <ShieldCheck className="w-4 h-4 text-purple-400" /> : <UserIcon className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                                {user.mobileAccess && (
                                  <Smartphone className="w-2.5 h-2.5 text-emerald-400" title="Mobile App Active" />
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-slate-500 mt-1">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.role === "admin" ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest">
                                Full System Admin
                              </span>
                            ) : (
                              (user.allowed_pages || []).map(p => (
                                <span key={p} className="px-1.5 py-0.5 rounded bg-slate-800/50 border border-white/5 text-slate-400 text-[8px] font-bold uppercase tracking-wider">
                                  {p}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditingPassword ? (
                              <div className="flex items-center gap-2 animate-fade-in">
                                <input
                                  type="text"
                                  autoFocus
                                  value={newPassword}
                                  onChange={e => setNewPassword(e.target.value)}
                                  placeholder="New password"
                                  className="bg-black/40 border border-indigo-500/50 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none w-32"
                                />
                                <button
                                  onClick={() => handleUpdatePassword(user.id)}
                                  disabled={isUpdatingPassword}
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all"
                                  title="Save Password"
                                >
                                  {isUpdatingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => { setEditingPasswordUserId(null); setNewPassword(""); }}
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingPasswordUserId(user.id)}
                                  className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                  title="Change Password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                {user.username !== "admin" && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                    title="Delete Account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: CONFIGURATION ACCESS SECURITY */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">Configuration Access Security</h2>
            <p className="text-[10px] text-slate-500 font-mono">DASHBOARD ADMIN ACCESS PROTECTION</p>
          </div>
        </div>

        <div className="bg-[#111216] border border-[#1e222b] rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dashboard Config Password */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Dashboard Config Password</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={configPassword}
                    onChange={e => setConfigPassword(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="admin0466"
                  />
                  <Settings className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Protects the <strong>Config</strong> tab from unauthorized access. Default: 'admin0466'.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveConfigPassword}
                  disabled={isSavingPassword}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white text-[10px] font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-95"
                >
                  {isSavingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Update Config Security
                </button>
              </div>
            </div>

            {/* Controller Password */}
            <div className="space-y-4 border-l border-white/5 pl-0 md:pl-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5 text-cyan-400" />
                  <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Controller (Clock) Password</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={ctrlPassword}
                    onChange={e => setCtrlPassword(e.target.value)}
                    className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="admin0466"
                  />
                  <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Protects the <strong>Dashboard Hub</strong> from the Clock page. Default: 'admin0466'.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveCtrlPassword}
                  disabled={isSavingCtrlPassword}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white text-[10px] font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 active:scale-95"
                >
                  {isSavingCtrlPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Update Controller Security
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
