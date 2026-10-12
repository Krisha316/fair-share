import { Routes, Route } from "react-router-dom";
import { useAuth } from "./auth";
import Sidebar from "./components/siderbar";
import TopBar from "./components/topBar";
import LoginPage from "./components/loginPage";
import Dashboard from "./components/dashboard";
import ProfilePage from "./components/profilePage";
import FriendsPage from "./components/friendsPage";
import Settings from "./components/settings";
import GroupPage from "./components/groups/groupPage";
import GroupDetails from "./components/groups/groupDetails";
import CreateGroup from "./components/groups/createGroup";
import JoinGroup from "./components/groups/joinGroup";
import ExpenseTracker from "./components/expenseTracker";
import AddExpense from "./components/addExpense";
import EditExpense from "./components/editExpense";
import Settlements from "./components/settlements";
import NotificationsPage from "./components/notificationsPage";
import RecurringPage from "./components/recurringPage";

function NotFound() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center text-center px-8 py-20">
      <h1 className="text-5xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-4 text-lg text-slate-500">That page doesn't exist.</p>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }
  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups" element={<GroupPage />} />
            <Route path="/groups/new" element={<CreateGroup />} />
            <Route path="/groups/:id" element={<GroupDetails />} />
            <Route path="/join-group" element={<JoinGroup />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/expenses" element={<ExpenseTracker />} />
            <Route path="/expenses/new" element={<AddExpense />} />
            <Route path="/expenses/:id/edit" element={<EditExpense />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settlements" element={<Settlements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;