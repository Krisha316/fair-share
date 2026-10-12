import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Plane, Users, Briefcase, UserPlus } from "lucide-react";
import { api } from "../../api";
import { groupThemes, memberColors, formatBalance, statusColor, kindLabel } from "../../utils";

const kindIcons = { home: Home, trip: Plane, friends: Users, work: Briefcase };

function GroupCard({ group, onChange }) {
  const navigate = useNavigate();
  const theme = groupThemes[group.theme] || groupThemes.green;
  const Icon = kindIcons[group.kind] || Users;

  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const open = () => navigate(`/groups/${group.id}`);

  const addMember = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/groups/${group.id}/members`, { username });
      setUsername("");
      setAdding(false);
      if (onChange) onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => e.key === "Enter" && open()}
        className="cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
      >
        <div className={`h-2 ${theme.bar}`} />
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${theme.iconBg} ${theme.iconText}`}>
              <Icon size={24} />
            </div>
            <span className="font-mono text-xs tracking-widest text-slate-400">CODE: {group.inviteCode}</span>
          </div>

          <h3 className="mt-8 text-2xl font-bold tracking-tight">{group.name}</h3>
          <p className="mt-1 text-slate-500">
            {kindLabel(group.kind)} • {group.memberCount} {group.memberCount === 1 ? "person" : "people"}
          </p>

          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-slate-400">Your balance</p>
              <p className={`mt-1 font-mono text-3xl font-bold ${statusColor[group.status]}`}>{formatBalance(group.balance)}</p>
            </div>

            <div className="flex -space-x-2">
              {group.members.map((m, i) => (
                <span
                  key={m.id}
                  title={m.name}
                  className={`w-10 h-10 rounded-full border-2 border-white text-xs font-semibold flex items-center justify-center text-ink ${memberColors[i % memberColors.length]}`}
                >
                  {m.initials}
                </span>
              ))}
              {group.extraMembers > 0 && (
                <span className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">
                  +{group.extraMembers}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-8 pt-5 border-t border-slate-100">
        {adding ? (
          <form onSubmit={addMember} className="flex gap-2">
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="@username"
              autoFocus
              className="flex-1 min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand"
            />
            <button type="submit" className="px-4 rounded-xl bg-ink text-white font-semibold hover:bg-inkSoft">
              Add
            </button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm font-semibold text-brand">
            <UserPlus size={16} /> Add member by username
          </button>
        )}
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}
      </div>
    </div>
  );
}

export default GroupCard;