import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { currencies } from "../utils";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
const labelClass = "block font-mono text-xs tracking-widest uppercase text-slate-500 mb-3";

function Message({ m }) {
  if (!m.text) return null;
  return <span className={`font-medium ${m.ok ? "text-money" : "text-rose"}`}>{m.text}</span>;
}

function Card({ eyebrow, title, children }) {
  return (
    <div className="rounded-[2rem] bg-white border border-slate-200 p-10">
      <p className="font-mono text-xs tracking-widest uppercase text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function Settings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    username: user.username,
    currency: user.currency,
    monthlyBudget: user.monthlyBudget,
  });
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState({ text: "", ok: true });

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.put("/auth/me", form);
      updateUser(updated);
      setMsg({ text: "Saved", ok: true });
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/password", pw);
      setPw({ currentPassword: "", newPassword: "" });
      setPwMsg({ text: "Password changed", ok: true });
    } catch (err) {
      setPwMsg({ text: err.message, ok: false });
    }
  };

  const button = "rounded-2xl bg-ink px-8 py-4 text-lg font-semibold text-white hover:bg-inkSoft transition-colors";

  return (
    <div className="px-8 lg:px-14 py-10 max-w-3xl space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-brand">Your account</p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">Settings</h1>
        <p className="mt-4 text-lg text-slate-500">Your username, how money is shown, and your monthly budget.</p>
      </div>

      <form onSubmit={saveSettings} className="space-y-8">
        <Card eyebrow="Account" title="Username">
          <p className="mt-2 text-slate-500">Friends find you with this. Letters, numbers and underscore only.</p>
          <div className="mt-6">
            <label className={labelClass}>Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputClass}
            />
          </div>
        </Card>

        <Card eyebrow="Preferences" title="Money">
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <label className={labelClass}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputClass}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Monthly budget (0 = off)</label>
              <input
                type="number"
                min="0"
                value={form.monthlyBudget}
                onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Your budget progress shows on the dashboard.</p>
          <div className="mt-8 flex items-center gap-4">
            <button type="submit" className={button}>
              Save settings
            </button>
            <Message m={msg} />
          </div>
        </Card>
      </form>

      <form onSubmit={savePassword}>
        <Card eyebrow="Security" title="Change password">
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <label className={labelClass}>Current password</label>
              <input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <button type="submit" className={button}>
              Change password
            </button>
            <Message m={pwMsg} />
          </div>
        </Card>
      </form>
    </div>
  );
}

export default Settings;