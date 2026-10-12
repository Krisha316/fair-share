import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { api } from "../api";
import { formatMoney, memberColors, statusColor } from "../utils";

function FriendsPage() {
  const [friends, setFriends] = useState(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/friends")
      .then(setFriends)
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/friends", { username });
      setUsername("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (f) => {
    if (!window.confirm(`Remove ${f.name} from your friends?`)) return;
    await api.delete(`/friends/${f.id}`);
    load();
  };

  return (
    <div className="px-8 lg:px-14 py-10 max-w-3xl">
      <p className="font-mono text-xs tracking-widest uppercase text-brand">Your people</p>
      <h1 className="mt-3 text-6xl font-bold tracking-tight">Friends</h1>
      <p className="mt-4 text-lg text-slate-500">Add friends by their username and see what you owe each other.</p>

      <form onSubmit={add} className="mt-10 flex gap-3">
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          placeholder="@username"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button
          type="submit"
          disabled={!username.trim()}
          className="flex items-center gap-2 px-7 rounded-2xl bg-ink text-white font-semibold hover:bg-inkSoft transition-colors disabled:bg-slate-400"
        >
          <UserPlus size={20} /> Add
        </button>
      </form>
      {error && <p className="mt-4 text-rose font-medium">{error}</p>}

      <div className="mt-8 rounded-3xl bg-white border border-slate-200 px-8">
        {!friends && <p className="py-6 text-slate-500">Loading...</p>}
        {friends && friends.length === 0 && <p className="py-6 text-slate-500">No friends yet. Add someone by username.</p>}
        {friends && friends.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-5">
                <span className={`w-12 h-12 rounded-full font-semibold flex items-center justify-center ${memberColors[f.id % memberColors.length]}`}>
                  {f.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg">{f.name}</p>
                  <p className="text-slate-500">@{f.username}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${statusColor[f.status]}`}>{f.statusText}</p>
                  {f.status !== "even" && <p className={`font-mono font-bold ${statusColor[f.status]}`}>{formatMoney(f.balance)}</p>}
                </div>
                <button onClick={() => remove(f)} aria-label="Remove friend" className="text-slate-300 hover:text-rose transition-colors">
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;