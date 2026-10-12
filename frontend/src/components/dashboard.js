import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, UserPlus, Wallet, ChevronRight, Receipt, Repeat } from "lucide-react";
import { useAuth } from "../auth";
import { api } from "../api";
import { formatMoney, formatBalance, formatDate, categoryLabel } from "../utils";
import { SettleRow } from "./settlements";
import GroupCard from "./groups/groupCard";

function Eyebrow({ children }) {
  return <p className="font-mono text-xs tracking-widest uppercase text-brand">{children}</p>;
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="p-14 text-rose">{error}</p>;
  if (!data) return <p className="p-14 text-slate-500">Loading...</p>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const { month } = data;

  return (
    <div className="px-8 lg:px-14 py-10 space-y-12">
      {/* Hero */}
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>
            {greeting}, {user.name.split(" ")[0]}
          </Eyebrow>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">Your money, sorted.</h1>
          <p className="mt-4 text-lg text-slate-500">Track personal spending and split costs with anyone.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/recurring?new=1"
          className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition-colors"
        >
          <Repeat size={20} />
          Add recurring
        </Link>
        <Link
          to="/expenses/new"
          className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-brand text-white font-semibold hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
        >
          <Plus size={20} />
          Add expense
        </Link>
      </div>
      </section>

      {/* Balance + monthly chart */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-ink text-white p-10">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full border-[48px] border-rose/20" />
          <div className="absolute top-12 right-16 w-32 h-32 rounded-full bg-rose/20" />

          <p className="relative font-mono text-xs tracking-widest uppercase text-slate-400">Your net balance</p>
          <p className="relative mt-16 text-7xl font-bold tracking-tight">{formatBalance(data.netBalance)}</p>
          <p className="relative mt-6 max-w-sm text-lg text-slate-300">{data.netMessage}</p>

          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link
              to="/settlements"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-ink font-semibold hover:bg-slate-100 transition-colors"
            >
              See settlements <ArrowUpRight size={16} />
            </Link>
            <Link
              to="/friends"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <UserPlus size={18} /> Find friends
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-8 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Your spending this month</Eyebrow>
              <p className="mt-3 text-4xl font-bold">{formatMoney(month.total)}</p>
              <p className="mt-1 text-slate-500">across {month.count} expenses</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sand text-amber-700 flex items-center justify-center">
              <Wallet size={22} />
            </div>
          </div>

          <div className="mt-8 flex-1 min-h-[140px] flex items-end gap-1">
            {month.daily.map((d) => (
              <div
                key={d.day}
                title={`${month.label} ${d.day}: ${formatMoney(d.amount)}`}
                className="flex-1 rounded-t-md bg-emerald-100"
                style={{ height: `${d.percent}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-sm text-slate-400">
            <span>{month.label} 1</span>
            <span>
              {month.label} {month.daily.length}
            </span>
          </div>

          {month.budget ? (
            <div className="mt-6">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${month.budget.over ? "bg-rose" : "bg-money"}`}
                  style={{ width: `${month.budget.percent}%` }}
                />
              </div>
              <p className={`mt-2 text-sm font-medium ${month.budget.over ? "text-rose" : "text-slate-500"}`}>
                {month.budget.over
                  ? `${formatMoney(month.budget.overBy)} over your budget`
                  : `${formatMoney(month.budget.remaining)} left of ${formatMoney(month.budget.amount)}`}
              </p>
            </div>
          ) : (
            <Link to="/settings" className="mt-6 text-sm font-semibold text-brand">
              Set a monthly budget →
            </Link>
          )}
        </div>
      </section>

      {/* Latest expenses + Settle up */}
      <section className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="flex items-end justify-between mb-5">
            <div>
              <Eyebrow>Latest expenses</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold">What has been paid</h2>
            </div>
            <Link to="/expenses" className="flex items-center gap-1 text-brand font-semibold">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          {data.latestExpenses.length === 0 ? (
            <p className="rounded-3xl bg-white border border-slate-200 p-8 text-slate-500">No expenses yet. Add your first one.</p>
          ) : (
            <ul className="rounded-3xl bg-white border border-slate-200 px-8 divide-y divide-slate-200">
              {data.latestExpenses.map((e) => (
                <li key={e.id} className="flex items-center gap-5 py-6">
                  <div className="w-14 h-14 rounded-2xl bg-mint text-money flex items-center justify-center">
                    <Receipt size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg">{e.title}</p>
                    <p className="text-slate-500 truncate">
                      {e.type === "personal" ? "Personal expense" : e.paidByMe ? "You paid" : `${e.paidByName} paid`}
                    </p>
                    <p className="text-sm text-slate-400">
                      {e.type === "personal" ? "Personal" : e.groupName} • {categoryLabel(e.category)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg">{formatMoney(e.amount)}</p>
                    <p className="text-sm text-slate-400">{formatDate(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between mb-5">
            <div>
              <Eyebrow>Who pays whom</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold">Settle up</h2>
            </div>
            <Link to="/settlements" className="flex items-center gap-1 text-brand font-semibold">
              Open list <ChevronRight size={16} />
            </Link>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6">
            {data.settlements.length === 0 ? (
              <p className="text-slate-500 p-2">You're all settled up.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {data.settlements.map((p, i) => (
                  <SettleRow key={i} payment={p} onPaid={load} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Groups */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <Eyebrow>Your groups</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold">Groups</h2>
          </div>
          <Link to="/groups" className="flex items-center gap-1 text-brand font-semibold">
            Manage groups <ChevronRight size={16} />
          </Link>
        </div>

        {data.groups.length === 0 ? (
          <p className="rounded-3xl bg-white border border-slate-200 p-8 text-slate-500">
            You're not in any group yet. <Link to="/groups/new" className="text-brand font-semibold">Create one</Link> or{" "}
            <Link to="/join-group" className="text-brand font-semibold">join with a code</Link>.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {data.groups.map((g) => (
              <GroupCard key={g.id} group={g} onChange={load} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;