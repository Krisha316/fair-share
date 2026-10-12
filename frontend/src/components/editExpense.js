import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { api } from "../api";
import { categories } from "../utils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-3";

function EditExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [form, setForm] = useState({ title: "", amount: "", category: "other", date: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/expenses/${id}`)
      .then((e) => {
        setExpense(e);
        setForm({ title: e.title, amount: String(e.amount), category: e.category, date: e.date });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.put(`/expenses/${id}`, { ...form, amount: Number(form.amount) });
      navigate(-1);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!expense) {
    return <p className={`p-14 ${error ? "text-rose" : "text-slate-500"}`}>{error || "Loading..."}</p>;
  }

  const locked = !expense.paidByMe;

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-3 font-semibold text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft size={20} /> Back
        </button>

        <h1 className="mt-12 text-5xl font-bold tracking-tight">Edit expense</h1>
        <p className="mt-4 text-lg text-slate-500">
          {expense.type === "group"
            ? `In ${expense.groupName}. If you change the amount, it is split equally between the same people again.`
            : "Personal expense."}
        </p>
        {locked && <p className="mt-4 text-rose font-medium">Only the person who paid can edit this expense.</p>}

        <form onSubmit={handleSubmit} className="mt-10 rounded-[2rem] bg-white border border-slate-200 p-10 space-y-8">
          <div>
            <label className={labelClass}>What was it for?</label>
            <input name="title" value={form.title} onChange={change} disabled={locked} className={inputClass} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <label className={labelClass}>Amount</label>
              <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={change} disabled={locked} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" value={form.category} onChange={change} disabled={locked} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Date</label>
            <input name="date" type="date" value={form.date} onChange={change} disabled={locked} className={inputClass} />
          </div>

          {error && <p className="text-rose font-medium">{error}</p>}

          <button
            type="submit"
            disabled={locked}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Check size={20} /> Save changes
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditExpense;