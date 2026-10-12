import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Receipt, Trash2, Pencil } from "lucide-react";
import { api } from "../api";
import { formatMoney, formatDate, categories, categoryLabel } from "../utils";

const tabs = [
  { id: "all", label: "All" },
  { id: "personal", label: "Personal" },
  { id: "group", label: "Group" },
];

function ExpenseTracker() {
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get(`/expenses?type=${type}&category=${category}`)
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, [type, category]);

  const remove = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="px-8 lg:px-14 py-10 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-brand">Personal and group</p>
          <h1 className="mt-3 text-6xl font-bold tracking-tight">Expenses</h1>
        </div>
        <Link to="/expenses/new" className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-ink text-white font-semibold hover:bg-inkSoft transition-colors">
          <Plus size={20} /> Add expense
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${
              type === t.id ? "bg-ink text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-8 text-rose">{error}</p>}
      {!data && !error && <p className="mt-8 text-slate-500">Loading...</p>}

      {data && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl bg-white border border-slate-200 px-8">
            {data.expenses.length === 0 ? (
              <p className="py-6 text-slate-500">No expenses found.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {data.expenses.map((e) => (
                  <li key={e.id} className="flex items-center gap-5 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-mint text-money flex items-center justify-center">
                      <Receipt size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg">{e.title}</p>
                      <p className="text-slate-500 truncate">
                        {e.type === "personal" ? "Personal" : `${e.groupName} • ${e.paidByMe ? "You paid" : `${e.paidByName} paid`}`}
                      </p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {categoryLabel(e.category)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg">{formatMoney(e.amount)}</p>
                      <p className="text-sm text-slate-400">{formatDate(e.createdAt)}</p>
                    </div>
                    {e.paidByMe && (
                    <div className="flex flex-col gap-2">
                        <Link to={`/expenses/${e.id}/edit`} aria-label="Edit expense" className="text-slate-300 hover:text-brand transition-colors">
                        <Pencil size={18} />
                        </Link>
                        <button onClick={() => remove(e.id)} aria-label="Delete expense" className="text-slate-300 hover:text-rose transition-colors">
                        <Trash2 size={18} />
                        </button>
                    </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-8 h-fit">
            <p className="font-mono text-xs tracking-widest uppercase text-brand">Total</p>
            <p className="mt-3 text-4xl font-bold">{formatMoney(data.total)}</p>

            <p className="mt-8 font-mono text-xs tracking-widest uppercase text-slate-400">By category</p>
            <div className="mt-4 space-y-4">
              {data.byCategory.length === 0 && <p className="text-slate-500">Nothing to show yet.</p>}
              {data.byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{categoryLabel(c.category)}</span>
                    <span className="text-slate-500">{formatMoney(c.total)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseTracker;