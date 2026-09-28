import React, { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChatbotSidebar } from "./components/ChatbotSidebar";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Analysis Workspace", path: "/analyze" },
  { label: "Models", path: "/models" },
  { label: "Reports", path: "/reports" },
  { label: "History", path: "/history" },
];

export const Layout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const pageTitle = NAV_ITEMS.find((item) => item.path === pathname)?.label ?? "Workspace";
    document.title = `${pageTitle} · Colorectal Histopathology Analysis`;
  }, [pathname]);

  return <div className="app-root gradient-bg">
    <header className="top-nav">
      <Link className="top-nav__brand" to="/" aria-label="Colorectal Histopathology Analysis home">
        Colorectal Histopathology Analysis
      </Link>
      <nav className="top-nav__links" aria-label="Main navigation">
        {NAV_ITEMS.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) => `top-nav__link-button${isActive ? " is-active" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
    <main className="page-shell page-shell--app"><Outlet /></main>
    {pathname !== "/analyze" && <ChatbotSidebar />}
    <footer className="app-footer">
      <span>Colorectal Histopathology Analysis</span>
      <span>Research and education · Not a clinical diagnosis</span>
    </footer>
  </div>;
};
