"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { 
  LogOut, Plus, Wallet, TrendingUp, TrendingDown, 
  HandCoins, LayoutDashboard, History, Filter, 
  Trash2, Edit3, X, Save, AlertCircle, Calendar,
  ArrowRightLeft, User, DollarSign, Download, 
  FileSpreadsheet, FileText, FileDown, Menu, Sun, Moon
} from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  format, subDays, subMonths, isAfter, 
  startOfWeek, startOfMonth, eachDayOfInterval, parseISO
} from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useTheme } from "next-themes";

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
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Form State
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "EXPENSE" as Category
  });

  const [activeTab, setActiveTab] = useState<Category | "ALL">("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  
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

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchTransactions();
    }
  }, [status, router]);

  // Reset image error if user changes
  useEffect(() => {
    setImageError(false);
  }, [session?.user?.image]);

  const timeFilteredTransactions = useMemo(() => {
    const now = new Date();
    if (timeFilter === "ALL") return transactions;
    
    // For "This Week", we use start of the week. For "This Month", start of the month.
    // However, "Last 7 days" and "Last 30 days" are often more intuitive.
    // Let's go with "Last 7 days" and "Last 30 days" as requested by "Weekly/Monthly".
    const startDate = timeFilter === "WEEK" ? subDays(now, 7) : subMonths(now, 1);
    
    return transactions.filter(tx => isAfter(new Date(tx.createdAt), startDate));
  }, [transactions, timeFilter]);

  const filteredTransactions = useMemo(() => {
    if (activeTab === "ALL") return timeFilteredTransactions;
    return timeFilteredTransactions.filter(tx => tx.category === activeTab);
  }, [timeFilteredTransactions, activeTab]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const dataMap: Record<string, { name: string, income: number, expense: number, payable: number, receivable: number }> = {};
    
    // Last 7 days or 30 days depending on filter
    const days = timeFilter === "ALL" ? 7 : (timeFilter === "WEEK" ? 7 : 30);
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const label = format(d, "MMM dd");
      dataMap[label] = { name: label, income: 0, expense: 0, payable: 0, receivable: 0 };
    }

    timeFilteredTransactions.forEach(tx => {
      const label = format(new Date(tx.createdAt), "MMM dd");
      if (dataMap[label]) {
        if (tx.category === "INCOME") dataMap[label].income += tx.amount;
        else if (tx.category === "EXPENSE") dataMap[label].expense += tx.amount;
        else if (tx.category === "PAYABLE") dataMap[label].payable += tx.amount;
        else if (tx.category === "RECEIVABLE") dataMap[label].receivable += tx.amount;
      }
    });

    return Object.values(dataMap);
  }, [timeFilteredTransactions, timeFilter]);

  const pieData = useMemo(() => {
    const counts = { INCOME: 0, EXPENSE: 0, PAYABLE: 0, RECEIVABLE: 0 };
    timeFilteredTransactions.forEach(tx => {
      counts[tx.category] += tx.amount;
    });
    return [
      { name: 'Income', value: counts.INCOME, color: '#10B981' },
      { name: 'Expense', value: counts.EXPENSE, color: '#EF4444' },
      { name: 'Payable', value: counts.PAYABLE, color: '#F43F5E' },
      { name: 'Receivable', value: counts.RECEIVABLE, color: '#34D399' },
    ].filter(d => d.value > 0);
  }, [timeFilteredTransactions]);

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

  // Calculations based on time filter
  const stats = useMemo(() => {
    const s = { income: 0, expense: 0, receivable: 0, payable: 0, net: 0 };
    timeFilteredTransactions.forEach(tx => {
      const amt = tx.amount;
      if (tx.category === "INCOME") s.income += amt;
      else if (tx.category === "EXPENSE") s.expense += amt;
      else if (tx.category === "RECEIVABLE") s.receivable += amt;
      else if (tx.category === "PAYABLE") s.payable += amt;
    });
    s.net = (s.income + s.receivable) - (s.expense + s.payable);
    return s;
  }, [timeFilteredTransactions]);

  // Export Functions
  const exportCSV = () => {
    // 1. Recalculate balances for all records to ensure the correct "Running Balance"
    const sortedAll = [...transactions].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let bal = 0;
    const map: Record<string, number> = {};
    sortedAll.forEach(tx => {
      const isPos = tx.category === "INCOME" || tx.category === "RECEIVABLE";
      bal += isPos ? tx.amount : -tx.amount;
      map[tx.id] = bal;
    });

    // 2. Prepare headers
    const headers = ["Date", "Time", "Category", "Description", "Amount", "Balance"];
    
    // 3. Map filtered transactions
    const rows = filteredTransactions.map(tx => {
      const dateObj = new Date(tx.createdAt);
      return [
        format(dateObj, "yyyy-MM-dd"),     // Clear date
        format(dateObj, "HH:mm:ss"),      // Clear time
        tx.category,
        tx.description,
        tx.amount,
        map[tx.id]                        // Running balance at that moment
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_${activeTab.toLowerCase()}_${timeFilter.toLowerCase()}_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `Expense Tracker Ledger - ${activeTab} (${timeFilter})`;
    
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 28);
    doc.text(`Total Balance for period: $${stats.net.toLocaleString()}`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [['Date & Time', 'Category', 'Description', 'Amount']],
      body: filteredTransactions.map(tx => [
        format(new Date(tx.createdAt), "MMM dd, yyyy HH:mm"),
        tx.category,
        tx.description,
        `$${tx.amount.toLocaleString()}`
      ]),
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 253, 250] },
      margin: { top: 40 },
    });
    
    doc.save(`ledger_${activeTab.toLowerCase()}_${timeFilter.toLowerCase()}.pdf`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
         <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 transition-colors duration-500">
      {/* Premium Gradient Backgrounds */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <span className="bg-emerald-500 p-1.5 rounded-lg lg:hidden">
                <Wallet size={20} className="text-white" />
              </span>
              <LayoutDashboard size={28} className="text-emerald-500 hidden lg:block" />
              <span className="hidden sm:inline">Financial Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">
              Welcome, {session?.user?.name?.split(" ")[0] || "User"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest">Account</p>
              <p className="text-sm font-bold text-foreground opacity-90">{session?.user?.name}</p>
            </div>
            
            <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/5 p-1 rounded-full pr-3 pl-1 shadow-xl">
              {mounted && (
                <button 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
              {(session?.user?.image && !imageError) ? (
                <img 
                  src={session.user.image} 
                  alt="user" 
                  onError={() => setImageError(true)}
                  className="w-8 h-8 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500">
                  <User size={16} />
                </div>
              )}
              <button 
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Navigation & Actions */}
        <div className="hidden lg:flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Category | "ALL")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border",
                    activeTab === tab.id 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                      : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-900 hover:text-slate-200"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-2xl border border-white/5">
              {[
                { id: "ALL", label: "All Time" },
                { id: "WEEK", label: "This Week" },
                { id: "MONTH", label: "This Month" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    timeFilter === f.id 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 border-l border-white/5 pl-6">
            <div className="flex bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
               <button onClick={exportCSV} className="p-3 text-slate-400 hover:text-white hover:bg-emerald-500/10 transition-colors border-r border-white/5" title="Export CSV">
                 <FileSpreadsheet size={20} />
               </button>
               <button onClick={exportPDF} className="p-3 text-slate-400 hover:text-white hover:bg-rose-500/10 transition-colors" title="Export PDF">
                 <FileText size={20} />
               </button>
            </div>
            
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ description: "", amount: "", category: activeTab !== "ALL" ? activeTab : "EXPENSE" });
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Mobile Filter Status Bar */}
        <div 
          onClick={() => setIsDrawerOpen(true)}
          className="lg:hidden flex items-center justify-between bg-white/[0.03] backdrop-blur-md p-4 mb-8 rounded-[24px] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-all shadow-xl"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                <Filter size={18} />
             </div>
             <div>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-0.5">Filter Active</p>
               <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <span>{tabs.find(t => t.id === activeTab)?.label}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-slate-400 font-medium">
                    {timeFilter === "ALL" ? "All Time" : timeFilter === "WEEK" ? "7 Days" : "30 Days"}
                  </span>
               </div>
             </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
            <Menu size={16} />
          </div>
        </div>

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
      
      {/* Analytics Section */}
      {activeTab === "ALL" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-fade-in delay-200">
          <div className="lg:col-span-2 glass-card p-6 h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" />
                Cash Flow Analysis
              </h3>
              <div className="flex items-center gap-4 text-xs font-bold">
                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="text-slate-500 dark:text-slate-400">Income</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> <span className="text-slate-500 dark:text-slate-400">Expense</span></div>
              </div>
            </div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      border: `1px solid ${theme === 'dark' ? '#ffffff10' : '#e2e8f0'}`, 
                      borderRadius: '16px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 h-[400px]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Filter size={20} className="text-emerald-500" />
              Allocation
            </h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      border: `1px solid ${theme === 'dark' ? '#ffffff10' : '#e2e8f0'}`, 
                      borderRadius: '16px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    content={({ payload }) => (
                      <ul className="flex flex-wrap justify-center gap-4 mt-4">
                        {payload?.map((entry: any, index: number) => (
                          <li key={`item-${index}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            {entry.value}
                          </li>
                        ))}
                      </ul>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Top Insight</p>
              <p className="text-sm text-slate-300 font-medium">
                {stats.income > stats.expense 
                  ? "Your income is higher than expenses this period. Keep it up!" 
                  : "Your expenses are exceeding your income. Time to review your budget."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8 animate-fade-in delay-200">
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 dark:border-white/5 flex flex-col md:flex-row justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 rounded-lg">
                 <History className="text-emerald-500" size={20} />
               </div>
               <h2 className="text-xl font-bold text-foreground tracking-tight">
                 {activeTab === "ALL" ? "Recent Ledger" : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Transaction History`}
               </h2>
             </div>
             <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Balance: <span className={cn("ml-2 font-black", stats.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    ${stats.net.toLocaleString()}
                  </span>
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-6 py-5 border-b border-border">Date & Time</th>
                  <th className="px-6 py-5 border-b border-border">Category</th>
                  <th className="px-6 py-5 border-b border-border">Description</th>
                  <th className="px-6 py-5 border-b border-border text-right">Amount</th>
                  <th className="px-6 py-5 border-b border-border text-right">Balance</th>
                  <th className="px-6 py-5 border-b border-border text-right">Actions</th>
                </tr>
              </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-white/5">
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
                      <tr key={tx.id} className="hover:bg-emerald-500/[0.02] dark:hover:bg-emerald-500/[0.03] transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                             <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm transition-transform group-hover:scale-105">
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-0.5">{format(new Date(tx.createdAt), "MMM")}</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{format(new Date(tx.createdAt), "dd")}</span>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.1em]">{format(new Date(tx.createdAt), "yyyy")}</span>
                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{format(new Date(tx.createdAt), "hh:mm a")}</span>
                             </div>
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
                          <p className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[180px] leading-tight">
                            {tx.description}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black tabular-nums text-sm",
                            (tx.category === "INCOME" || tx.category === "RECEIVABLE") ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
                          )}>
                            {(tx.category === "EXPENSE" || tx.category === "PAYABLE") ? "-" : "+"}${tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black tabular-nums text-sm",
                            balancesMap[tx.id] >= 0 ? "text-emerald-500/80" : "text-rose-500/80"
                          )}>
                            ${balancesMap[tx.id].toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleEdit(tx)}
                              className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(tx.id)}
                              className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                              title="Delete"
                            >
                              <Trash2 size={16} />
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
           <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="z-10 w-full max-w-md bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="text-emerald-500" size={20} />
                  {editingId ? "Edit Transaction" : "New Entry"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-foreground">
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
      {/* Mobile Sticky Add Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-[60] lg:hidden animate-fade-in">
        <button 
           onClick={() => {
              setEditingId(null);
              setFormData({ description: "", amount: "", category: activeTab !== "ALL" ? activeTab : "EXPENSE" });
              setIsModalOpen(true);
            }}
          className="w-16 h-16 bg-emerald-500 text-white rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in" 
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          
          {/* Sheet Content */}
          <div className="absolute left-0 right-0 bottom-0 bg-card rounded-t-[40px] border-t border-border shadow-2xl animate-fade-in flex flex-col p-8 pt-4">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-8 opacity-40"></div>
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Filter size={20} />
                </div>
                Filter Dashboard
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-8 max-h-[70vh] overflow-y-auto pb-8">
              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] pl-1">Range</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "WEEK", label: "7 Days" },
                    { id: "MONTH", label: "30 Days" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTimeFilter(f.id as any)}
                      className={cn(
                        "px-4 py-4 rounded-3xl text-xs font-bold transition-all border",
                        timeFilter === f.id 
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20" 
                          : "bg-slate-800/40 text-slate-400 border-white/5"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] pl-1">Category</p>
                <div className="grid grid-cols-2 gap-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as Category | "ALL");
                        setIsDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-5 py-5 rounded-[24px] text-sm font-bold transition-all border",
                        activeTab === tab.id 
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                          : "bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-border"
                      )}
                    >
                      <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "text-slate-400 dark:text-slate-600"} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
          type === "positive" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" : "bg-rose-500/10 text-rose-600 dark:text-rose-500"
        )}>
          <Icon size={24} />
        </div>
        <p className="text-xs font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">{title}</p>
      </div>
      
      <div>
        <h4 className="text-3xl font-black tabular-nums text-foreground">${amount.toLocaleString()}</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium italic">{desc}</p>
      </div>
    </div>
  );
}
