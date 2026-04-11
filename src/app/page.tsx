"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wallet, LogIn, ChevronRight, BarChart3, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden px-4 transition-colors duration-500">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>

      <div className="z-10 text-center space-y-8 max-w-2xl animate-fade-in">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold mb-4">
          <Zap size={14} className="animate-pulse" />
          <span>Track Smarter, Live Better</span>
        </div>

        <div className="flex justify-center mb-6">
          <div className="p-4 bg-emerald-500 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <Wallet size={48} className="text-white" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
          Expense <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-600">Tracker</span>
        </h1>

        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed max-w-lg mx-auto font-medium">
          The most elegant way to manage your income, expenses, receivables (Pawna), and payables (Dena). Modern, secure, and insightful.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
           {[
             { icon: BarChart3, label: "Detailed Insights" },
             { icon: ShieldCheck, label: "Google Secured" },
             { icon: Wallet, label: "Multi-category Ledger" }
           ].map((feature, i) => (
             <div key={i} className="flex items-center space-x-3 text-foreground/80 bg-slate-100 dark:bg-slate-900/40 p-3 rounded-2xl border border-border">
                <feature.icon className="text-emerald-500" size={20} />
                <span className="text-sm font-bold">{feature.label}</span>
             </div>
           ))}
        </div>

        <button
          onClick={() => signIn("google")}
          className="group relative flex items-center justify-center space-x-3 w-full max-w-sm mx-auto py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-lg font-bold rounded-2xl transition-all shadow-2xl hover:scale-[1.02] active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent transition-opacity group-hover:opacity-100 opacity-0"></div>
          <LogIn size={20} />
          <span>Login with Google</span>
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold mt-8">
          Powered by Next.js 15 & Prisma
        </p>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
        &copy; 2026 ExpenseTracker. All rights reserved.
      </footer>
    </div>
  );
}
