import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Plus } from "lucide-react";
import { api } from "../../api";
import { formatMoney } from "../../utils";
import GroupCard from "./groupCard";

function StatCard({ value, label, valueClass }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
      <p className={`text-4xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-2 text-lg text-slate-500">{label}</p>
    </div>
  );
}

function GroupPage() {
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

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-brand">Your groups</p>
          <h1 className="mt-3 text-6xl font-bold tracking-tight">Groups</h1>
          <p className="mt-4 text-lg text-slate-500">Keep home, trip, friends and work costs in one simple place.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/join-group" className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition-colors">
            <Link2 size={20} /> Join
          </Link>
          <Link to="/groups/new" className="flex items-center gap-2 px-7 py-4 rounded-2xl bg-ink text-white font-semibold hover:bg-inkSoft transition-colors">
            <Plus size={20} /> New group
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <StatCard value={data.groups.length} label="active groups" valueClass="text-ink" />
        <StatCard value={formatMoney(data.month.total)} label="your spending this month" valueClass="text-money" />
        <StatCard value={data.settlementCount} label="payments to settle" valueClass="text-amber-700" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((group) => (
          <GroupCard key={group.id} group={group} onChange={load} />
        ))}

        <Link
          to="/groups/new"
          className="min-h-[340px] rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 hover:bg-white hover:border-slate-400 transition-colors flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose/10 text-rose flex items-center justify-center">
            <Plus size={28} />
          </div>
          <p className="mt-6 text-xl font-bold">Start another group</p>
          <p className="mt-1 text-slate-500">Home, trip, friends or work</p>
        </Link>
      </div>
    </div>
  );
}

export default GroupPage;