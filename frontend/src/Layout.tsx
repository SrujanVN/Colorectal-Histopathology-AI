import React from "react";
import { Outlet, useLocation } from "react-router-dom";

export const Layout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const scrollToSection = (id: string) => {
    if (isHomePage) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // If not on home page, navigate to home with hash
      window.location.href = `/#${id}`;
      // After navigation, scroll will be handled by Home component's useEffect
    }
  };

  const scrollToTop = () => {
    if (isHomePage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="app-root gradient-bg">
      <header className="top-nav">
        <div className="top-nav__brand">Colorectal Cancer XAI</div>
        <nav className="top-nav__links">
          <button
            onClick={scrollToTop}
            className="top-nav__link-button"
            type="button"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection("features")}
            className="top-nav__link-button"
            type="button"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className="top-nav__link-button"
            type="button"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection("analyze")}
            className="top-nav__link-button"
            type="button"
          >
            Analyze
          </button>
          <button
            onClick={() => scrollToSection("history")}
            className="top-nav__link-button"
            type="button"
          >
            History
          </button>
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
};


