import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { api } from "../api";
import { formatMoney, formatDate, memberColors } from "../utils";

// One "A pays B" row. Used here and on the dashboard.
export function SettleRow({ payment, onPaid }) {
  const { from, to, amount, groupId, groupName, direction } = payment;

  const markPaid = async () => {
    try {
      await api.post("/settlements", { groupId, fromUser: from.id, toUser: to.id, amount });
      onPaid();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <li className="flex items-center gap-3 py-5">
      <span className={`w-10 h-10 rounded-full text-xs font-semibold flex items-center justify-center ${memberColors[from.id % memberColors.length]}`}>
        {from.initials}
      </span>
      <ArrowUpRight size={16} className="text-slate-400 rotate-45" />
      <span className={`w-10 h-10 rounded-full text-xs font-semibold flex items-center justify-center ${memberColors[to.id % memberColors.length]}`}>
        {to.initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{direction === "pay" ? `You pay ${to.name}` : `${from.name} pays you`}</p>
        <p className="text-sm text-slate-500">{groupName}</p>
      </div>
      <p className="font-mono font-bold">{formatMoney(amount)}</p>
      <button onClick={markPaid} className="px-4 py-2.5 rounded-xl bg-mint text-money font-semibold hover:bg-emerald-100 transition-colors">
        {direction === "pay" ? "Mark paid" : "Mark received"}
      </button>
    </li>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="rounded-3xl bg-white border border-slate-200 px-8 py-2">{children}</div>
    </div>
  );
}

function Settlements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/settlements")
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="p-14 text-rose">{error}</p>;
  if (!data) return <p className="p-14 text-slate-500">Loading...</p>;

  return (
    <div className="px-8 lg:px-14 py-10 max-w-4xl space-y-10">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-brand">Who pays whom</p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">Settlements</h1>
        <p className="mt-4 text-lg text-slate-500">The fewest payments needed to make every group even.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
          <p className="text-4xl font-bold tracking-tight text-rose">{formatMoney(data.totalToPay)}</p>
          <p className="mt-2 text-lg text-slate-500">you need to pay</p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 px-8 py-7">
          <p className="text-4xl font-bold tracking-tight text-money">{formatMoney(data.totalToReceive)}</p>
          <p className="mt-2 text-lg text-slate-500">you will receive</p>
        </div>
      </div>

      <Block title="You need to pay">
        {data.toPay.length === 0 ? (
          <p className="py-6 text-slate-500">You don't owe anyone. 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.toPay.map((p, i) => (
              <SettleRow key={i} payment={p} onPaid={load} />
            ))}
          </ul>
        )}
      </Block>

      <Block title="You will receive">
        {data.toReceive.length === 0 ? (
          <p className="py-6 text-slate-500">Nobody owes you right now.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.toReceive.map((p, i) => (
              <SettleRow key={i} payment={p} onPaid={load} />
            ))}
          </ul>
        )}
      </Block>

      <Block title="Payment history">
        {data.history.length === 0 ? (
          <p className="py-6 text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-5">
                <div>
                  <p className="font-semibold">{h.text}</p>
                  <p className="text-sm text-slate-500">
                    {h.groupName} • {formatDate(h.createdAt)}
                  </p>
                </div>
                <p className={`font-mono font-bold ${h.iPaid ? "text-rose" : "text-money"}`}>{formatMoney(h.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

export default Settlements;