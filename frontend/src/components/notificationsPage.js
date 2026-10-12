import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Receipt, Wallet, Users, UserPlus, Repeat, Trash2, CheckCheck } from "lucide-react";
import { api } from "../api";
import { formatMoney, formatDate } from "../utils";

const icons = { expense: Receipt, settlement: Wallet, member: Users, friend: UserPlus, recurring: Repeat };

const changed = () => window.dispatchEvent(new Event("notifications-changed"));

function NotificationsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/notifications")
      .then(setData)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    changed();
    load();
  };

  const clearAll = async () => {
    if (!window.confirm("Clear all notifications?")) return;
    await api.delete("/notifications");
    changed();
    load();
  };

  const markRead = async (n) => {
    if (n.isRead) return;
    await api.put(`/notifications/${n.id}/read`);
    changed();
    load();
  };

  if (error) return <p className="p-14 text-rose">{error}</p>;
  if (!data) return <p className="p-14 text-slate-500">Loading...</p>;

  const time = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="px-8 lg:px-14 py-10 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-brand">Activity</p>
          <h1 className="mt-3 text-6xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-4 text-lg text-slate-500">
            {data.unreadCount > 0 ? `${data.unreadCount} unread` : "You are all caught up."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={markAllRead}
            disabled={data.unreadCount === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition-colors disabled:text-slate-300 disabled:hover:bg-white"
          >
            <CheckCheck size={18} /> Mark all read
          </button>
          <button
            onClick={clearAll}
            disabled={data.notifications.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold hover:bg-slate-50 transition-colors disabled:text-slate-300 disabled:hover:bg-white"
          >
            <Trash2 size={18} /> Clear
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white border border-slate-200 overflow-hidden">
        {data.notifications.length === 0 ? (
          <p className="p-8 text-slate-500">Nothing here yet. Activity in your groups will show up here.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.notifications.map((n) => {
              const Icon = icons[n.type] || Bell;
              const body = (
                <>
                  <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${n.isRead ? "bg-slate-100 text-slate-400" : "bg-mint text-money"}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={n.isRead ? "text-slate-600" : "font-semibold"}>{n.message}</p>
                    <p className="text-sm text-slate-400">
                      {n.groupName ? `${n.groupName} • ` : ""}
                      {formatDate(n.createdAt)}, {time(n.createdAt)}
                    </p>
                  </div>
                  {n.amount !== null && <p className="font-mono font-bold">{formatMoney(n.amount)}</p>}
                  {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-brand" />}
                </>
              );
              const rowClass = `flex items-center gap-4 px-8 py-5 transition-colors hover:bg-slate-50 ${n.isRead ? "" : "bg-brand/5"}`;
              return (
                <li key={n.id}>
                  {n.groupId ? (
                    <Link to={`/groups/${n.groupId}`} onClick={() => markRead(n)} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <div onClick={() => markRead(n)} className={`${rowClass} cursor-pointer`}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;