import { useEffect, useState } from "react";
import { Mail, Check } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";

const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-3";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user.name);
  const [counts, setCounts] = useState({ groupCount: 0, expenseCount: 0 });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me").then((me) => setCounts({ groupCount: me.groupCount, expenseCount: me.expenseCount })).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const updated = await api.put("/auth/me", { name: fullName });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="max-w-6xl mx-auto">
        <p className="font-mono text-xs tracking-widest uppercase text-brand">Your account</p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">Profile</h1>
        <p className="mt-4 text-lg text-slate-500">The details people in your groups see.</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.8fr]">
          <div className="rounded-[2rem] bg-white border border-slate-200 px-10 py-12 flex flex-col items-center justify-center text-center">
            <div className="w-28 h-28 rounded-full bg-brand ring-4 ring-white shadow-md flex items-center justify-center text-3xl font-bold text-white">
              {user.initials}
            </div>
            <h2 className="mt-8 text-3xl font-bold tracking-tight">{user.name}</h2>
            <p className="mt-2 text-lg text-slate-500">@{user.username}</p>
            <p className="text-slate-400">{user.email}</p>

            <div className="mt-10 w-full border-t border-amber-100 pt-8 grid grid-cols-[1fr_auto_1fr] items-center">
              <div>
                <p className="text-4xl font-bold">{counts.groupCount}</p>
                <p className="mt-1 text-slate-500">groups</p>
              </div>
              <div className="w-px h-14 bg-amber-100" />
              <div>
                <p className="text-4xl font-bold">{counts.expenseCount}</p>
                <p className="mt-1 text-slate-500">expenses paid</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white border border-slate-200 p-10">
            <p className="font-mono text-xs tracking-widest uppercase text-brand">Personal details</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">How you show up</h2>

            <div className="mt-10 space-y-8">
              <div>
                <label htmlFor="fullName" className={labelClass}>Full name</label>
                <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email address</label>
                <div className="relative">
                  <Mail size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    value={user.email}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-14 pr-5 py-4 text-lg text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
            </div>

            {error && <p className="mt-6 text-rose font-medium">{error}</p>}

            <div className="mt-10 flex items-center gap-4">
              <button type="submit" className="rounded-2xl bg-ink px-8 py-4 text-lg font-semibold text-white hover:bg-inkSoft transition-colors">
                Save changes
              </button>
              {saved && (
                <span className="flex items-center gap-2 font-medium text-money">
                  <Check size={18} /> Saved
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;