import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, LogOut, Repeat, Receipt, Copy, Check } from "lucide-react";
import { api } from "../../api";
import { SettleRow } from "../settlements";
import {
  formatMoney, formatBalance, formatDate, categoryLabel, kindLabel, frequencyLabel,
  groupThemes, memberColors, statusColor, barWidth,
} from "../../utils";

function Card({ eyebrow, title, action, children }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-brand">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, valueClass = "text-ink" }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
      <p className={`text-4xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-2 text-lg text-slate-500">{label}</p>
    </div>
  );
}

function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () =>
    api
      .get(`/groups/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    setData(null);
    setError("");
    load();
  }, [id]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert(`Invite code: ${data.inviteCode}`);
    }
  };

  const leave = async () => {
    if (!window.confirm(`Leave "${data.name}"?`)) return;
    try {
      await api.post(`/groups/${id}/leave`);
      navigate("/groups");
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm(`Delete "${data.name}" for everyone? This removes all its expenses.`)) return;
    try {
      await api.delete(`/groups/${id}`);
      navigate("/groups");
    } catch (err) {
      alert(err.message);
    }
  };

  const removeExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) {
    return (
      <div className="p-14">
        <p className="text-rose">{error}</p>
        <Link to="/groups" className="mt-4 inline-block font-semibold text-brand">
          Back to groups
        </Link>
      </div>
    );
  }
  if (!data) return <p className="p-14 text-slate-500">Loading...</p>;

  const theme = groupThemes[data.theme] || groupThemes.green;

  return (
    <div className="px-8 lg:px-14 py-10 max-w-6xl space-y-8">
      <Link to="/groups" className="inline-flex items-center gap-3 font-semibold text-slate-500 hover:text-ink transition-colors">
        <ArrowLeft size={20} /> Back to groups
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-3xl bg-white border border-slate-200">
        <div className={`h-2 ${theme.bar}`} />
        <div className="p-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-brand">
              {kindLabel(data.kind)} • since {formatDate(data.createdOn)}
            </p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight">{data.name}</h1>
            <button
              onClick={copyCode}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-mono text-sm tracking-widest text-slate-600 hover:bg-slate-200 transition-colors"
            >
              CODE: {data.inviteCode} {copied ? <Check size={16} className="text-money" /> : <Copy size={16} />}
            </button>
          </div>
          <Link
            to={`/expenses/new?group=${data.id}`}
            className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-ink text-white font-semibold hover:bg-inkSoft transition-colors"
          >
            <Plus size={20} /> Add expense
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="your balance" value={formatBalance(data.balance)} valueClass={statusColor[data.status]} />
        <Stat label="group spending" value={formatMoney(data.totalSpent)} />
        <Stat label="people" value={data.members.length} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        {/* Expenses */}
        <Card eyebrow="Everything paid" title="Expenses">
          {data.expenses.length === 0 ? (
            <p className="text-slate-500">No expenses in this group yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-5">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-mint text-money flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">{e.title}</p>
                    <p className="text-slate-500 truncate">{e.paidByMe ? "You paid" : `${e.paidByName} paid`}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-400">
                      {categoryLabel(e.category)}
                      {e.isRecurring && (
                        <>
                          <span>•</span>
                          <Repeat size={13} /> Recurring
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg">{formatMoney(e.amount)}</p>
                    <p className="text-sm text-slate-400">Your share {formatMoney(e.yourShare)}</p>
                    <p className="text-sm text-slate-400">{formatDate(e.createdAt)}</p>
                  </div>
                  {e.paidByMe && (
                    <div className="flex flex-col gap-2">
                      <Link to={`/expenses/${e.id}/edit`} aria-label="Edit expense" className="text-slate-300 hover:text-brand transition-colors">
                        <Pencil size={18} />
                      </Link>
                      <button onClick={() => removeExpense(e.id)} aria-label="Delete expense" className="text-slate-300 hover:text-rose transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-8">
          {/* Members */}
          <Card eyebrow="Who is in" title="Members">
            <ul className="divide-y divide-slate-200">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-4">
                  <span className={`w-11 h-11 shrink-0 rounded-full text-sm font-semibold flex items-center justify-center ${memberColors[m.id % memberColors.length]}`}>
                    {m.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {m.name}
                      {m.isMe && <span className="ml-2 text-sm font-medium text-slate-400">(you)</span>}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      @{m.username}
                      {m.isCreator && " • creator"}
                    </p>
                  </div>
                  <p className={`font-mono font-bold ${statusColor[m.status]}`}>
                    {m.status === "even" ? "Settled" : formatBalance(m.balance)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          {/* Settle up */}
          <Card eyebrow="Who pays whom" title="Settle up">
            {data.payments.length === 0 ? (
              <p className="text-slate-500">Everyone is settled up.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {data.payments.map((p, i) =>
                  p.direction === "other" ? (
                    <li key={i} className="flex items-center justify-between gap-3 py-5">
                      <p className="text-slate-600">
                        {p.from.name} pays {p.to.name}
                      </p>
                      <p className="font-mono font-bold">{formatMoney(p.amount)}</p>
                    </li>
                  ) : (
                    <SettleRow key={i} payment={p} onPaid={load} />
                  )
                )}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Spending by category */}
        <Card eyebrow="Where it went" title="By category">
          {data.byCategory.length === 0 ? (
            <p className="text-slate-500">Nothing to show yet.</p>
          ) : (
            <div className="space-y-4">
              {data.byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm font-medium">
                    <span>
                      {categoryLabel(c.category)} • {c.percent}%
                    </span>
                    <span className="text-slate-500">{formatMoney(c.total)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full bg-brand ${barWidth(c.percent)}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recurring */}
        <Card
          eyebrow="Repeats on its own"
          title="Recurring payments"
          action={
            <Link to="/recurring" className="text-sm font-semibold text-brand">
              Manage
            </Link>
          }
        >
          {data.recurring.length === 0 ? (
            <p className="text-slate-500">No recurring payments in this group.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.recurring.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.title}</p>
                    <p className="text-sm text-slate-500">
                      {frequencyLabel(r.frequency)} • {r.dueText}
                    </p>
                  </div>
                  <p className="font-mono font-bold">{formatMoney(r.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Payment history */}
      <Card eyebrow="Settled so far" title="Payment history">
        {data.history.length === 0 ? (
          <p className="text-slate-500">No payments recorded in this group yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{h.text}</p>
                  <p className="text-sm text-slate-500">{formatDate(h.createdAt)}</p>
                </div>
                <p className="font-mono font-bold">{formatMoney(h.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Leave / delete */}
      <div className="rounded-3xl border border-rose/30 bg-white p-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold">Leave this group</h2>
          <p className="mt-2 text-slate-500">
            {data.canLeave
              ? "Your past expenses stay in the group for everyone else."
              : data.leaveHint}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={leave}
            disabled={!data.canLeave}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-rose text-white font-semibold hover:bg-rose/90 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <LogOut size={18} /> Leave group
          </button>
          {data.isCreator && (
            <button
              onClick={deleteGroup}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-rose text-rose font-semibold hover:bg-rose/10 transition-colors"
            >
              <Trash2 size={18} /> Delete group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetails;