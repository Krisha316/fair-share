import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Users, Check } from "lucide-react";
import { api } from "../../api";

function JoinGroup() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!joined) return;
    const timer = setTimeout(() => navigate("/groups"), 1200);
    return () => clearTimeout(timer);
  }, [joined, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/groups/join", { code });
      setJoined(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="max-w-xl mx-auto">
        <Link to="/groups" className="inline-flex items-center gap-3 font-semibold text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft size={20} /> Back to groups
        </Link>

        <div className="mt-12 overflow-hidden rounded-[2rem] bg-white border border-slate-200">
          <div className="bg-sand px-9 py-9">
            <div className="w-16 h-16 rounded-2xl bg-ink text-white flex items-center justify-center">
              <Link2 size={26} />
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight">Join a group</h1>
            <p className="mt-3 text-lg text-amber-900/70">Enter the invite code someone shared with you.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-9 py-9">
            <label htmlFor="inviteCode" className="block font-mono text-xs tracking-widest uppercase text-slate-500 mb-4">
              Invite code
            </label>
            <input
              id="inviteCode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="e.g. A1B2C3"
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg uppercase outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />

            <button
              type="submit"
              disabled={!code.trim() || joined}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <Users size={20} /> Join group
            </button>

            {error && <p className="mt-5 text-center text-rose font-medium">{error}</p>}
            {joined && (
              <p className="mt-5 flex items-center justify-center gap-2 text-money font-medium">
                <Check size={18} /> Joined! Taking you to your groups...
              </p>
            )}
            {!error && !joined && (
              <p className="mt-5 text-center text-slate-500">No code? Ask a group member to invite you.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinGroup;