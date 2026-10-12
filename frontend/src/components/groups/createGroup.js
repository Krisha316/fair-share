import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { api } from "../../api";
import { groupThemes, groupKinds } from "../../utils";

const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-4";

function CreateGroup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("home");
  const [theme, setTheme] = useState("green");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/groups", { name, kind, theme });
      navigate("/groups");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/groups" className="inline-flex items-center gap-3 font-semibold text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft size={20} /> Back to groups
        </Link>

        <p className="mt-12 font-mono text-xs tracking-widest uppercase text-brand">New group</p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">Start a new group</h1>
        <p className="mt-4 text-lg text-slate-500">Create a shared space for family, flatmates, friends or coworkers.</p>

        <form onSubmit={handleSubmit} className="mt-10 rounded-[2rem] bg-white border border-slate-200 p-10">
          <label htmlFor="groupName" className={labelClass}>Group name</label>
          <input
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa trip"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
          />

          <p className={`${labelClass} mt-10`}>What kind of group?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {groupKinds.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`text-left rounded-2xl border px-5 py-4 transition-colors ${
                  kind === k.id ? "border-2 border-money bg-mint text-ink" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <p className="text-lg font-semibold">{k.title}</p>
                <p className="mt-1 text-sm">{k.hint}</p>
              </button>
            ))}
          </div>

          <p className={`${labelClass} mt-10`}>Choose a group color</p>
          <div className="flex items-center gap-4">
            {Object.entries(groupThemes).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                aria-label={`${key} color`}
                className={`w-10 h-10 rounded-full transition ${t.swatch} ${theme === key ? "ring-2 ring-ink ring-offset-2" : ""}`}
              />
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-slate-50 px-6 py-5">
            <p className="flex items-center gap-2 font-semibold text-lg">
              <Sparkles size={20} className="text-brand" /> Invite people with a code
            </p>
            <p className="mt-2 text-slate-500">After you create the group, share its invite code from the group card.</p>
          </div>

          {error && <p className="mt-6 text-rose font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <Plus size={20} /> Create group
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroup;