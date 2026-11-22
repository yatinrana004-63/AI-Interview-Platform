import { lazy, Suspense } from "react";
import { SignInButton, UserButton, useAuth, useUser } from "@clerk/react";
import { BookOpen, Command, LayoutDashboard, ListVideo, LockKeyhole, Sparkles, Video } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard.jsx";

const Practice = lazy(() => import("./Practice.jsx"));
const Solve = lazy(() => import("./Solve.jsx"));
const Rooms = lazy(() => import("./Rooms.jsx"));
const Interview = lazy(() => import("./Interview.jsx"));
const Assistant = lazy(() => import("./Assistant.jsx"));

const navigation = [
  { Icon: LayoutDashboard, name: "Overview", path: "/" },
  { Icon: BookOpen, name: "Practice", path: "/practice" },
  { Icon: Video, name: "Interview rooms", path: "/rooms" },
  { Icon: Sparkles, name: "AI interviewer", path: "/coach" },
];

function SignInGate({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="status-note" role="status">Loading your session…</p>;
  if (isSignedIn) return children;

  return (
    <section className="empty panel">
      <div className="icon-box"><LockKeyhole size={22} /></div>
      <h1>Sign in to continue</h1>
      <p>Use your account to access interviews and save your progress.</p>
      <SignInButton mode="modal"><button className="button primary">Sign in</button></SignInButton>
    </section>
  );
}

export default function App() {
  const { isSignedIn, user } = useUser();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to content</a>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Talent IQ home">
          <span className="brand-icon"><Command size={21} /></span>
          <span>Talent<span className="brand-iq">IQ</span></span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="nav-list">
          {navigation.map((item) => {
            const { Icon, name, path } = item;
            return (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={18} /><span>{name}</span>
            </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title"><ListVideo size={17} /> <span>Interview workspace</span></div>
          <div className="topbar-account">
            {isSignedIn ? <><span>{user?.firstName || user?.username || "My account"}</span><UserButton /></>
              : <SignInButton mode="modal"><button className="button ghost">Sign in</button></SignInButton>}
          </div>
        </header>
        <main id="workspace" className="workspace">
          <Suspense fallback={<p className="status-note" role="status">Loading workspace…</p>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/practice/:slug" element={<Solve />} />
              <Route path="/rooms" element={<SignInGate><Rooms /></SignInGate>} />
              <Route path="/rooms/:id" element={<SignInGate><Interview /></SignInGate>} />
              <Route path="/coach" element={<SignInGate><Assistant /></SignInGate>} />
              <Route path="*" element={<section className="empty panel"><h1>Page not found</h1><Link className="button primary" to="/">Go to overview</Link></section>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
