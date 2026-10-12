import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell, ChevronDown, User, Settings, LogOut, CheckCircle2, CheckCheck,
  Receipt, Wallet, Users, UserPlus, Repeat,
} from "lucide-react";
import { useAuth } from "../auth";
import { api } from "../api";
import { formatMoney, formatDate } from "../utils";

const icons = { expense: Receipt, settlement: Wallet, member: Users, friend: UserPlus, recurring: Repeat };

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function TopBar() {
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState({ notifications: [], unreadCount: 0 });
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  // Load on start, every 30 seconds, and whenever another page changes notifications
  useEffect(() => {
    const load = () =>
      api
        .get("/notifications")
        .then(setNotifs)
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("notifications-changed", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("notifications-changed", load);
    };
  }, []);

  const changed = () => window.dispatchEvent(new Event("notifications-changed"));

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    changed();
  };

  const openNotification = async (n) => {
    setNotifOpen(false);
    if (!n.isRead) {
      await api.put(`/notifications/${n.id}/read`);
      changed();
    }
  };

  const latest = notifs.notifications.slice(0, 5);

  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    .toUpperCase();

  const itemClass = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors";

  return (
    <header className="relative z-20 shrink-0 flex items-center justify-between px-8 lg:px-14 h-14 bg-cream border-b border-slate-200">
      <p className="font-mono text-xs tracking-widest text-slate-500">{today}</p>

      <div className="flex items-center gap-5">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative text-slate-600 hover:text-ink transition-colors"
            aria-label="Notifications"
          >
            <Bell size={22} strokeWidth={1.8} />
            {notifs.unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center">
                {notifs.unreadCount > 9 ? "9+" : notifs.unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-3 w-96 max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <p className="font-semibold">Notifications</p>
                {notifs.unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                    <CheckCheck size={15} /> Mark all read
                  </button>
                )}
              </div>

              {latest.length === 0 ? (
                <div className="flex flex-col items-center text-center px-6 py-10">
                  <div className="w-14 h-14 rounded-full bg-mint text-money flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <p className="mt-4 font-semibold text-lg">You're all caught up</p>
                  <p className="mt-1 text-sm text-slate-500">No new notifications right now.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {latest.map((n) => {
                    const Icon = icons[n.type] || Bell;
                    return (
                      <li key={n.id}>
                        <Link
                          to={n.groupId ? `/groups/${n.groupId}` : "/notifications"}
                          onClick={() => openNotification(n)}
                          className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors ${n.isRead ? "" : "bg-brand/5"}`}
                        >
                          <div
                            className={`mt-0.5 w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                              n.isRead ? "bg-slate-100 text-slate-400" : "bg-mint text-money"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${n.isRead ? "text-slate-600" : "font-semibold"}`}>{n.message}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {n.groupName ? `${n.groupName} • ` : ""}
                              {formatDate(n.createdAt)}
                            </p>
                          </div>
                          {n.amount !== null && <p className="font-mono text-sm font-bold">{formatMoney(n.amount)}</p>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Link
                to="/notifications"
                onClick={() => setNotifOpen(false)}
                className="block px-5 py-3 text-center text-sm font-semibold text-brand border-t border-slate-100 hover:bg-slate-50 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5"
          >
            <span className="w-8 h-8 rounded-full bg-brand/20 text-brand text-xs font-semibold flex items-center justify-center">
              {user.initials}
            </span>
            <span className="font-semibold">{user.name.split(" ")[0]}</span>
            <ChevronDown size={16} className={`text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="p-2">
                <Link to="/profile" onClick={() => setProfileOpen(false)} className={itemClass}>
                  <User size={18} /> My profile
                </Link>
                <Link to="/settings" onClick={() => setProfileOpen(false)} className={itemClass}>
                  <Settings size={18} /> Settings
                </Link>
              </div>
              <div className="p-2 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose hover:bg-rose/10 transition-colors"
                >
                  <LogOut size={18} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;