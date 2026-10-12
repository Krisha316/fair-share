import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Repeat, Pause, Play, Trash2 } from "lucide-react";
import { api } from "../api";
import { formatMoney, categories, categoryLabel, frequencies, frequencyLabel } from "../utils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-3";

const empty = { title: "", amount: "", category: "bills", frequency: "monthly", startDate: "" };

function RecurringPage() {
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [params] = useSearchParams();
  const [showForm, setShowForm] = useState(params.get("new") === "1");
  const [type, setType] = useState("personal");
  const [groupId, setGroupId] = useState("");
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/recurring")
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api
      .get("/groups")
      .then((g) => {
        setGroups(g);
        if (g.length) setGroupId(String(g[0].id));
      })
      .catch(() => {});
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/recurring", {
        type,
        groupId: type === "group" ? Number(groupId) : undefined,
        title: form.title,
        amount: Number(form.amount),
        category: form.category,
        frequency: form.frequency,
        startDate: form.startDate || undefined,
      });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (id) => {
    try {
      await api.put(`/recurring/${id}/toggle`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? Expenses it already created stay.`)) return;
    try {
      await api.delete(`/recurring/${item.id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const tabClass = (active) =>
    `flex-1 rounded-2xl border px-5 py-4 text-left transition-colors ${
      active ? "border-2 border-money bg-mint text-ink" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
    }`;

  if (!data) return <p className={`p-14 ${error ? "text-rose" : "text-slate-500"}`}>{error || "Loading..."}</p>;

  return (
    <div className="px-8 lg:px-14 py-10 max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-brand">Rent, bills and subscriptions</p>
          <h1 className="mt-3 text-6xl font-bold tracking-tight">Recurring</h1>
          <p className="mt-4 text-lg text-slate-500">These add themselves as expenses on their due date.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-ink text-white font-semibold hover:bg-inkSoft transition-colors"
        >
          <Plus size={20} /> {showForm ? "Close" : "New recurring payment"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
          <p className="text-4xl font-bold tracking-tight">{data.activeCount}</p>
          <p className="mt-2 text-lg text-slate-500">active</p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
          <p className="text-4xl font-bold tracking-tight text-amber-700">{data.dueSoonCount}</p>
          <p className="mt-2 text-lg text-slate-500">due in the next 7 days</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={create} className="rounded-[2rem] bg-white border border-slate-200 p-10 space-y-8">
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-4">
              <button type="button" onClick={() => setType("personal")} className={tabClass(type === "personal")}>
                <p className="text-lg font-semibold">Personal</p>
                <p className="mt-1 text-sm">Just for me</p>
              </button>
              <button type="button" onClick={() => setType("group")} className={tabClass(type === "group")}>
                <p className="text-lg font-semibold">Group</p>
                <p className="mt-1 text-sm">You pay, split equally</p>
              </button>
            </div>
          </div>

          {type === "group" && (
            <div>
              <label className={labelClass}>Group</label>
              {groups.length === 0 ? (
                <p className="text-slate-500">
                  You're not in a group yet. <Link to="/groups/new" className="text-brand font-semibold">Create one</Link>.
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
            <label className={labelClass}>What is it for?</label>
            <input name="title" value={form.title} onChange={change} placeholder="e.g. Rent" className={inputClass} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <label className={labelClass}>Amount</label>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={change} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" value={form.category} onChange={change} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Repeats</label>
              <select name="frequency" value={form.frequency} onChange={change} className={inputClass}>
                {frequencies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>First due date (optional)</label>
              <input name="startDate" type="date" value={form.startDate} onChange={change} className={inputClass} />
            </div>
          </div>

          {error && <p className="text-rose font-medium">{error}</p>}

          <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors">
            <Repeat size={20} /> Save recurring payment
          </button>
        </form>
      )}

      <div className="rounded-3xl bg-white border border-slate-200 px-8">
        {data.items.length === 0 ? (
          <p className="py-6 text-slate-500">No recurring payments yet. Add your rent, a subscription or a weekly cost.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.items.map((r) => (
              <li key={r.id} className="flex items-center gap-5 py-6">
                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${r.active ? "bg-mint text-money" : "bg-slate-100 text-slate-400"}`}>
                  <Repeat size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">{r.title}</p>
                  <p className="text-slate-500 truncate">
                    {frequencyLabel(r.frequency)} • {r.type === "personal" ? "Personal" : r.groupName} • {categoryLabel(r.category)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Paid {r.timesPaid} {r.timesPaid === 1 ? "time" : "times"} ({formatMoney(r.totalPaid)} total)
                    {r.type === "group" && !r.createdByMe && ` • set up by ${r.createdByName}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-lg">{formatMoney(r.amount)}</p>
                  <p className={`text-sm font-medium ${r.active && r.daysUntilDue <= 7 ? "text-amber-700" : "text-slate-400"}`}>
                    {r.dueText}
                    {r.active && ` (${r.nextDue})`}
                  </p>
                </div>
                {r.createdByMe && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => toggle(r.id)} aria-label={r.active ? "Pause" : "Resume"} className="text-slate-300 hover:text-brand transition-colors">
                      {r.active ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button onClick={() => remove(r)} aria-label="Delete" className="text-slate-300 hover:text-rose transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RecurringPage;