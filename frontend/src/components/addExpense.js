import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "../api";
import { categories } from "../utils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-3";

function AddExpense() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetGroup = params.get("group");
  const [type, setType] = useState(presetGroup ? "group" : "personal");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/groups")
      .then((g) => {
        setGroups(g);
        if (g.length) {
            setGroupId(presetGroup && g.some((x) => String(x.id) === presetGroup) ? presetGroup : String(g[0].id));
          }
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/expenses", {
        type,
        groupId: type === "group" ? Number(groupId) : undefined,
        title,
        amount: Number(amount),
        category,
        date: date || undefined,
      });
      navigate("/expenses");
    } catch (err) {
      setError(err.message);
    }
  };

  const tabClass = (active) =>
    `flex-1 rounded-2xl border px-5 py-4 text-left transition-colors ${
      active ? "border-2 border-money bg-mint text-ink" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
    }`;

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/expenses" className="inline-flex items-center gap-3 font-semibold text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft size={20} /> Back to expenses
        </Link>

        <h1 className="mt-12 text-5xl font-bold tracking-tight">Add an expense</h1>
        <p className="mt-4 text-lg text-slate-500">Track your own spending, or split a cost with a group.</p>

        <form onSubmit={handleSubmit} className="mt-10 rounded-[2rem] bg-white border border-slate-200 p-10 space-y-8">
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-4">
              <button type="button" onClick={() => setType("personal")} className={tabClass(type === "personal")}>
                <p className="text-lg font-semibold">Personal</p>
                <p className="mt-1 text-sm">Just for me</p>
              </button>
              <button type="button" onClick={() => setType("group")} className={tabClass(type === "group")}>
                <p className="text-lg font-semibold">Group</p>
                <p className="mt-1 text-sm">Split equally with a group</p>
              </button>
            </div>
          </div>

          {type === "group" && (
            <div>
              <label className={labelClass}>Group</label>
              {groups.length === 0 ? (
                <p className="text-slate-500">
                  You're not in a group yet. <Link to="/groups/new" className="text-brand font-semibold">Create one</Link> or{" "}
                  <Link to="/join-group" className="text-brand font-semibold">join one</Link>.
                </p>
              ) : (
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputClass}>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>What was it for?</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dinner" className={inputClass} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Date (optional, defaults to today)</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>

          {error && <p className="text-rose font-medium">{error}</p>}

          <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors">
            <Plus size={20} /> Add expense
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddExpense;