import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, Receipt, ArrowRight, Link2, Settings, Repeat, Bell,
  ChevronRight, ChevronsLeft, ChevronsRight, IndianRupee,
} from "lucide-react";
import { useAuth } from "../auth";
import { api } from "../api";

const mainLinks = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/friends", label: "Friends", icon: UserPlus },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/settlements", label: "Settlements", icon: ArrowRight },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: true },
];

const quickLinks = [
  { to: "/join-group", label: "Join a group", icon: Link2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ item, collapsed, unread }) {
  const Icon = item.icon;
  const showBadge = item.badge && unread > 0;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `relative flex items-center rounded-xl text-[15px] font-medium transition-colors ${
          collapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5"
        } ${isActive ? "bg-brand/30 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`
      }
    >
      <Icon size={19} strokeWidth={1.8} />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {showBadge && (
        <span
          className={`flex items-center justify-center rounded-full bg-rose text-white text-[11px] font-bold ${
            collapsed ? "absolute top-1 right-1 w-4 h-4" : "min-w-[1.35rem] h-[1.35rem] px-1"
          }`}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </NavLink>
  );
}

function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () =>
      api
        .get("/notifications/unread-count")
        .then((d) => setUnread(d.count))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("notifications-changed", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("notifications-changed", load);
    };
  }, [location.pathname]);

  const toggle = () => {
    localStorage.setItem("sidebarCollapsed", String(!collapsed));
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={`flex shrink-0 h-screen flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-ink text-white py-4 transition-all duration-200 ${
        collapsed ? "w-20 px-3" : "w-60 xl:w-64 px-3"
      }`}
    >
      <div className={`flex items-center mb-6 ${collapsed ? "flex-col gap-3" : "justify-between px-1"}`}>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight">
              fair<span className="text-brand">share</span>
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronsRight size={19} /> : <ChevronsLeft size={19} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {mainLinks.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} unread={unread} />
        ))}
      </nav>

      <div className="my-3 border-t border-white/10" />

      <nav className="flex flex-col gap-1">
        {quickLinks.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} unread={0} />
        ))}
      </nav>

      <Link
        to="/profile"
        title={collapsed ? user.name : undefined}
        className={`mt-auto flex items-center rounded-2xl bg-inkSoft hover:bg-white/10 transition-colors ${
          collapsed ? "justify-center p-2" : "gap-3 p-3"
        }`}
      >
        <div className="w-10 h-10 shrink-0 rounded-full border-2 border-brand bg-brand/20 flex items-center justify-center text-sm font-semibold">
          {user.initials}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight truncate">{user.name}</p>
              <p className="text-sm text-slate-400 truncate">@{user.username}</p>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </>
        )}
      </Link>
    </aside>
  );
}

export default Sidebar;