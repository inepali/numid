"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  adminGetStats, 
  adminSearchUsers, 
  adminToggleUserStatus, 
  adminDeleteUser,
  adminRecreateRoute
} from "@/app/actions/admin";
import { 
  Users, 
  Search, 
  UserMinus, 
  UserCheck, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Smartphone, 
  Mail, 
  ShieldAlert, 
  ArrowLeft, 
  Loader2, 
  History,
  CheckCircle,
  AlertTriangle,
  Play
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

// Client Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-supabase.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // Modal deletion state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Status message triggers
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validate admin permissions and load statistics
  const checkAdminAndLoad = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    // Fetch stats & logs
    const res = await adminGetStats();
    if (res.success) {
      setStats(res.stats);
      setSystemLogs(res.auditLogs || []);
    } else {
      setErrorMsg(res.message);
    }

    // Fetch initial user list
    const userRes = await adminSearchUsers("");
    if (userRes.success) {
      setUsers(userRes.users || []);
    } else {
      setErrorMsg(userRes.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    startTransition(async () => {
      const res = await adminSearchUsers(searchQuery);
      if (res.success) {
        setUsers(res.users || []);
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await adminToggleUserStatus(userId, currentStatus);
      if (res.success) {
        setSuccessMsg(res.message);
        // Refresh stats & user list
        const updatedStats = await adminGetStats();
        if (updatedStats.success) {
          setStats(updatedStats.stats);
          setSystemLogs(updatedStats.auditLogs || []);
        }
        const updatedUsers = await adminSearchUsers(searchQuery);
        if (updatedUsers.success) {
          setUsers(updatedUsers.users || []);
        }
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleRecreateRoute = (userId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await adminRecreateRoute(userId);
      if (res.success) {
        setSuccessMsg(res.message);
        // Refresh list
        const updatedUsers = await adminSearchUsers(searchQuery);
        if (updatedUsers.success) {
          setUsers(updatedUsers.users || []);
        }
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleDeleteUser = () => {
    if (!deleteTargetId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await adminDeleteUser(deleteTargetId);
      if (res.success) {
        setSuccessMsg(res.message);
        setDeleteTargetId(null);
        // Refresh stats & list
        const updatedStats = await adminGetStats();
        if (updatedStats.success) {
          setStats(updatedStats.stats);
          setSystemLogs(updatedStats.auditLogs || []);
        }
        const updatedUsers = await adminSearchUsers(searchQuery);
        if (updatedUsers.success) {
          setUsers(updatedUsers.users || []);
        }
      } else {
        setErrorMsg(res.message);
        setDeleteTargetId(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs">Authenticating administrator authorization...</p>
      </div>
    );
  }

  // FALLBACK: Unauthorized
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center px-6 text-center text-slate-500 dark:text-slate-400">
        <ShieldAlert className="w-16 h-16 text-red-500/80 mb-6 animate-pulse" />
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Forbidden</h2>
        <p className="text-xs max-w-sm mb-6 leading-relaxed">
          Your account does not possess administrative privileges. Please log in using an admin email to access this panel.
        </p>
        <Link 
          href="/dashboard" 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center">
              <img src="/logo.svg" alt="NumID Logo" className="w-8 h-8 object-contain rounded-lg" />
            </Link>
            <span className="font-display font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Num<span className="text-indigo-650 dark:text-indigo-400">ID</span> <span className="text-slate-550 dark:text-slate-500 text-xs font-semibold ml-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 uppercase tracking-wider">Admin</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <Link
              href="/dashboard"
              className="text-xs bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>User Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 dark:text-red-200">Admin Command Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-750 dark:text-indigo-300 text-xs flex items-start space-x-2.5">
            <CheckCircle className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-indigo-850 dark:text-indigo-200">Admin Command Success</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* 1. Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 relative shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Registers</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{stats?.totalUsers}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 relative shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Active Forwards</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{stats?.activeUsers}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 relative shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-3">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Pending Setups</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{stats?.pendingUsers}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 relative shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-650 dark:text-pink-400 mb-3">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">SMS OTP Success</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{stats?.smsSuccessRate}%</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({stats?.smsVerified}/{stats?.smsSent})</span>
            </div>
          </div>

        </div>

        {/* 2. User Searching & Table management */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">User Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Query and manage forwarding channels, verify triggers, or disable routes.</p>
            </div>

            <form onSubmit={handleSearch} className="relative w-full sm:w-[320px]">
              <input
                type="text"
                placeholder="Search phone, email, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:border-indigo-500/40 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button type="submit" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-505 hover:text-slate-700 dark:hover:text-white transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* User records list */}
          <div className="overflow-x-auto w-full border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 backdrop-blur">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Phone & NumID</th>
                  <th className="p-4">Forwarding Destination</th>
                  <th className="p-4">Verify Status</th>
                  <th className="p-4">Route ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No matching user profiles found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-white">{u.phone_number}</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{u.numid_address}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{u.destination_email}</p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4 space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                           <span className={`w-1.5 h-1.5 rounded-full ${u.phone_verified ? "bg-emerald-500" : "bg-red-500"}`} />
                          <span className="text-[10px] text-slate-550 dark:text-slate-400">SMS Verification</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${u.email_verified ? "bg-emerald-500" : "bg-red-500"}`} />
                          <span className="text-[10px] text-slate-550 dark:text-slate-400">Email Verification</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-[10px]">
                        {u.cloudflare_route_id ? (
                          <span className="text-slate-600 dark:text-slate-400 select-all">{u.cloudflare_route_id}</span>
                        ) : (
                          <span className="italic text-slate-450 dark:text-slate-600">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${u.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30" : u.status === "disabled" ? "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30" : "bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30"}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          disabled={isPending}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] border transition-colors ${u.status === "disabled" ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20"}`}
                          title={u.status === "disabled" ? "Enable Forwards" : "Disable Forwards"}
                        >
                          {u.status === "disabled" ? "Enable" : "Disable"}
                        </button>

                        <button
                          onClick={() => handleRecreateRoute(u.id)}
                          disabled={isPending || !u.phone_verified || !u.email_verified}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Recreate Cloudflare Route Mapping"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Sync DNS</span>
                        </button>

                        <button
                          onClick={() => setDeleteTargetId(u.id)}
                          disabled={isPending}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Recent Global System Logs */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center space-x-2.5 mb-6">
            <History className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">System-Wide Audit Trails</h3>
          </div>

          {systemLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No recent audit trail logs available.
            </div>
          ) : (
            <div className="relative border-l border-slate-200 dark:border-white/5 ml-4 pl-6 space-y-6">
              {systemLogs.map((log) => (
                <div key={log.id} className="relative text-left">
                  <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-650 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-850 dark:text-slate-300 uppercase tracking-wider">{log.action.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({log.id.substring(0, 8)})</span>
                    </div>
                    <span className="text-[10px] text-slate-550 font-mono mt-1 sm:mt-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 p-3 rounded-lg bg-slate-55 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-600 dark:text-slate-500 overflow-x-auto max-w-full">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* CONFIRM DELETE MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-red-500/20 rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-2 text-red-650 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">Force Account Teardown?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              This will permanently delete user record <strong className="text-slate-900 dark:text-white font-mono">{deleteTargetId}</strong> from our database, cancel their Cloudflare forwarding rule, and drop their Supabase authentication row.
            </p>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              
              <button
                onClick={handleDeleteUser}
                disabled={isPending}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-505 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5"
              >
                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Teardown & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
