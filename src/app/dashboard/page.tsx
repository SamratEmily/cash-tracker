"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { 
  LogOut, Plus, Wallet, TrendingUp, TrendingDown, 
  HandCoins, LayoutDashboard, History, Filter, 
  Trash2, Edit3, X, Save, AlertCircle, Calendar,
  ArrowRightLeft, User, DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: Category;
  createdAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "EXPENSE" as Category
  });

  const [activeTab, setActiveTab] = useState<Category | "ALL">("ALL");
  
  const tabs = [
    { id: "ALL", label: "Overview", icon: LayoutDashboard },
    { id: "INCOME", label: "Income", icon: TrendingUp },
    { id: "EXPENSE", label: "Expense", icon: TrendingDown },
    { id: "PAYABLE", label: "Payable", icon: Wallet },
    { id: "RECEIVABLE", label: "Receivable", icon: HandCoins },
  ];

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchTransactions();
    }
  }, [status, router]);

  const filteredTransactions = useMemo(() => {
    if (activeTab === "ALL") return transactions;
    return transactions.filter(tx => tx.category === activeTab);
  }, [transactions, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const body = editingId ? { ...formData, id: editingId } : formData;

    try {
      const res = await fetch("/api/transactions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ description: "", amount: "", category: "EXPENSE" });
        fetchTransactions();
      }
    } catch (err) {
      console.error("Error saving transaction:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({
      description: tx.description,
      amount: tx.amount.toString(),
      category: tx.category
    });
    setIsModalOpen(true);
  };

  // Calculations
  const stats = useMemo(() => {
    const s = { income: 0, expense: 0, receivable: 0, payable: 0, net: 0 };
    transactions.forEach(tx => {
      const amt = tx.amount;
      if (tx.category === "INCOME") s.income += amt;
      else if (tx.category === "EXPENSE") s.expense += amt;
      else if (tx.category === "RECEIVABLE") s.receivable += amt;
      else if (tx.category === "PAYABLE") s.payable += amt;
    });
    // Net Calculation: (Income + Receivable) - (Expense + Payable)
    // Or maybe Income - Expense. Let's do (Income + Receivable) - (Expense + Payable) for overall balance.
    s.net = (s.income + s.receivable) - (s.expense + s.payable);
    return s;
  }, [transactions]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
         <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="text-emerald-500" />
            Financial Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Welcome back, {session?.user?.name?.split(" ")[0] || "User"}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ 
                description: "", 
                amount: "", 
                category: activeTab !== "ALL" ? activeTab : "EXPENSE" 
              });
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Add Transaction
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="hidden md:block text-right">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account</p>
               <p className="text-sm font-semibold text-slate-200">{session?.user?.name}</p>
            </div>
            {session?.user?.image && (
              <img 
                src={session.user.image} 
                alt="user" 
                className="w-10 h-10 rounded-full border border-white/10 shadow-lg"
              />
            )}
            <button 
              onClick={() => signOut()}
              className="p-3 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap items-center gap-2 mb-8 animate-fade-in delay-75">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Category | "ALL")}
            className={cn(
               "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all border",
               activeTab === tab.id 
                 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                 : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in delay-100">
        <SummaryCard 
          title="Receivable (Pawna)" 
          amount={stats.receivable} 
          icon={HandCoins} 
          type="positive" 
          desc="Money others owe you"
        />
        <SummaryCard 
          title="Payable (Dena)" 
          amount={stats.payable} 
          icon={TrendingDown} 
          type="negative" 
          desc="Money you owe others"
        />
        <SummaryCard 
          title="Total Income" 
          amount={stats.income} 
          icon={TrendingUp} 
          type="positive" 
          desc="Earnings this period"
        />
        <SummaryCard 
          title="Total Expense" 
          amount={stats.expense} 
          icon={DollarSign} 
          type="negative" 
          desc="Spendings this period"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8 animate-fade-in delay-200">
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 rounded-lg">
                 <History className="text-emerald-500" size={20} />
               </div>
               <h2 className="text-xl font-bold text-white tracking-tight">
                 {activeTab === "ALL" ? "Recent Ledger" : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Transaction History`}
               </h2>
             </div>
             <div className="flex items-center gap-4 bg-slate-950/50 p-1 rounded-xl border border-white/5">
                <div className="px-4 py-2 text-sm font-medium text-slate-400">
                  Total Balance: <span className={cn("ml-2 font-bold", stats.net >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    ${stats.net.toLocaleString()}
                  </span>
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/30 text-slate-500 text-xs uppercase tracking-widest font-bold">
                  <th className="px-6 py-4 border-b border-white/5">Date & Time</th>
                  <th className="px-6 py-4 border-b border-white/5">Category</th>
                  <th className="px-6 py-4 border-b border-white/5">Description</th>
                  <th className="px-6 py-4 border-b border-white/5 text-right">Amount</th>
                  <th className="px-6 py-4 border-b border-white/5 text-right">Balance</th>
                  <th className="px-6 py-4 border-b border-white/5 text-right">Actions</th>
                </tr>
              </thead>
               <tbody className="divide-y divide-white/5">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="text-slate-700" />
                        <p>No {activeTab !== "ALL" ? activeTab.toLowerCase() : ""} transactions found</p>
                        <button 
                          onClick={() => {
                            if (activeTab !== "ALL") {
                              setFormData({ ...formData, category: activeTab as Category });
                            }
                            setIsModalOpen(true);
                          }}
                          className="text-emerald-500 hover:underline text-sm font-bold mt-2"
                        >
                          Add {activeTab !== "ALL" ? activeTab.toLowerCase() : "your first"} record
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let runningBalance = 0;
                    const sortedForBalance = [...transactions].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    const balancesMap: Record<string, number> = {};
                    sortedForBalance.forEach(tx => {
                      const isPos = tx.category === "INCOME" || tx.category === "RECEIVABLE";
                      runningBalance += isPos ? tx.amount : -tx.amount;
                      balancesMap[tx.id] = runningBalance;
                    });

                    return filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-300 font-medium">{format(new Date(tx.createdAt), "MMM dd, yyyy")}</span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase">{format(new Date(tx.createdAt), "hh:mm a")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "badge",
                            tx.category === "INCOME" && "badge-income",
                            tx.category === "EXPENSE" && "badge-expense",
                            tx.category === "RECEIVABLE" && "badge-receivable",
                            tx.category === "PAYABLE" && "badge-payable",
                          )}>
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 font-medium truncate max-w-[200px]">{tx.description}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-bold tabular-nums",
                            (tx.category === "INCOME" || tx.category === "RECEIVABLE") ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {(tx.category === "EXPENSE" || tx.category === "PAYABLE") ? "-" : "+"}${tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black text-white tabular-nums",
                            balancesMap[tx.id] >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
                          )}>
                            ${balancesMap[tx.id].toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(tx)}
                              className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(tx.id)}
                              className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
               {filteredTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900/50">
                    <td colSpan={3} className="px-6 py-4 font-bold text-slate-400 uppercase text-xs tracking-tighter">
                      {activeTab === "ALL" ? "Ledger Summary" : `${activeTab} Total`} (Items: {filteredTransactions.length})
                    </td>
                    <td className="px-6 py-4 font-black text-xl tabular-nums text-white">
                      ${(activeTab === "ALL" 
                        ? stats.net 
                        : filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0)
                      ).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                      {activeTab !== "ALL" && (
                        <span>Subtotal for {activeTab.toLowerCase()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/20">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="text-emerald-500" size={20} />
                  {editingId ? "Edit Transaction" : "New Entry"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["INCOME", "EXPENSE", "RECEIVABLE", "PAYABLE"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat as Category })}
                        className={cn(
                          "py-3 px-4 rounded-xl text-xs font-bold transition-all border",
                          formData.category === cat 
                            ? "bg-emerald-500 text-white border-emerald-400" 
                            : "bg-slate-800/10 text-slate-400 border-white/5 hover:bg-slate-800"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      placeholder="0.00"
                      className="input-field pl-8 text-xl font-bold"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <input 
                    type="text" 
                    required
                    placeholder="What was this for?"
                    className="input-field"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Save size={18} />
                    {editingId ? "Update" : "Save Entry"}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, amount, icon: Icon, type, desc }: { 
  title: string; 
  amount: number; 
  icon: any; 
  type: "positive" | "negative";
  desc: string;
}) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform">
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-10 -mt-10",
        type === "positive" ? "bg-emerald-500" : "bg-rose-500"
      )}></div>
      
      <div className="flex items-center justify-between">
        <div className={cn(
          "p-3 rounded-xl",
          type === "positive" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          <Icon size={24} />
        </div>
        <p className="text-xs font-black text-slate-600 uppercase tracking-widest">{title}</p>
      </div>
      
      <div>
        <h4 className="text-3xl font-black tabular-nums text-white">${amount.toLocaleString()}</h4>
        <p className="text-xs text-slate-500 mt-1 font-medium italic">{desc}</p>
      </div>
    </div>
  );
}
