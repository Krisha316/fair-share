import { useState } from "react";
import { IndianRupee } from "lucide-react";
import { useAuth } from "../auth";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await (isRegister ? register(form) : login(form));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center">
            <IndianRupee size={22} />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            fair<span className="text-brand">share</span>
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-3 text-slate-500">Track your spending and split expenses fairly with anyone.</p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[2rem] bg-white border border-slate-200 p-8 space-y-5">
          {isRegister && (
            <>
              <input name="name" value={form.name} onChange={change} placeholder="Full name" className={inputClass} />
              <input name="username" value={form.username} onChange={change} placeholder="Username (e.g. krisha_s)" className={inputClass} />
            </>
          )}
          <input
            name="email"
            type={isRegister ? "email" : "text"}
            value={form.email}
            onChange={change}
            placeholder={isRegister ? "Email" : "Email or username"}
            className={inputClass}
          />
          <input name="password" type="password" value={form.password} onChange={change} placeholder="Password" className={inputClass} />

          {error && <p className="text-rose font-medium">{error}</p>}

          <button type="submit" className="w-full rounded-2xl py-4 text-lg font-semibold text-white bg-ink hover:bg-inkSoft transition-colors">
            {isRegister ? "Sign up" : "Log in"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="mt-6 w-full text-center text-slate-500 hover:text-ink"
        >
          {isRegister ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;