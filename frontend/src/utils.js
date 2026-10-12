export const groupThemes = {
    green: { bar: "bg-money", iconBg: "bg-mint", iconText: "text-money", swatch: "bg-[#dcefe6]" },
    amber: { bar: "bg-amber-600", iconBg: "bg-sand", iconText: "text-amber-700", swatch: "bg-[#fdf0c4]" },
    rose: { bar: "bg-rose", iconBg: "bg-rose/10", iconText: "text-rose", swatch: "bg-[#f3ddd8]" },
    violet: { bar: "bg-violet-500", iconBg: "bg-violet-100", iconText: "text-violet-600", swatch: "bg-[#e6e2f3]" },
    sky: { bar: "bg-sky-500", iconBg: "bg-sky-100", iconText: "text-sky-600", swatch: "bg-[#dde9f0]" },
  };
  
  export const groupKinds = [
    { id: "home", title: "Home", hint: "Rent and bills" },
    { id: "trip", title: "Trip", hint: "Travel together" },
    { id: "friends", title: "Friends", hint: "Meals and outings" },
    { id: "work", title: "Work", hint: "Team costs" },
  ];
  export const kindLabel = (id) => groupKinds.find((k) => k.id === id)?.title || "Group";
  
  export const categories = [
    { id: "food", label: "Food" },
    { id: "travel", label: "Travel" },
    { id: "rent", label: "Rent" },
    { id: "shopping", label: "Shopping" },
    { id: "bills", label: "Bills" },
    { id: "entertainment", label: "Entertainment" },
    { id: "health", label: "Health" },
    { id: "other", label: "Other" },
  ];
  export const categoryLabel = (id) => categories.find((c) => c.id === id)?.label || "Other";
  
  export const currencies = ["INR", "USD", "EUR", "GBP"];
  
  export const memberColors = ["bg-violet-300", "bg-amber-200", "bg-emerald-200", "bg-pink-200", "bg-slate-200"];
  
  // The backend sends a status ("owed" | "owes" | "even"); this only maps it to a color
  export const statusColor = { owed: "text-money", owes: "text-rose", even: "text-slate-500" };
  
  // ---- display formatting only ----
  let currency = "INR";
  export const setCurrency = (c) => {
    currency = c || "INR";
  };
  const locales = { INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB" };
  
  export function formatMoney(amount) {
    return new Intl.NumberFormat(locales[currency], { style: "currency", currency }).format(Math.abs(amount));
  }
  
  // +₹100.00 / -₹50.00
  export function formatBalance(amount) {
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${sign}${formatMoney(amount)}`;
  }
  
  export function formatDate(value) {
    const d = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  }
  export const frequencies = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
  ];
  export const frequencyLabel = (id) => frequencies.find((f) => f.id === id)?.label || id;
  
  // Bar widths without inline styles: rounds to the nearest 10% and returns a static Tailwind class
  const widths = ["w-0", "w-[10%]", "w-[20%]", "w-[30%]", "w-[40%]", "w-[50%]", "w-[60%]", "w-[70%]", "w-[80%]", "w-[90%]", "w-full"];
  export const barWidth = (percent) => widths[Math.min(10, Math.max(0, Math.round(percent / 10)))];