import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { Home } from "./pages/Home";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home page="home" />} />
          <Route path="/analyze" element={<Home page="analyze" />} />
          <Route path="/models" element={<Home page="models" />} />
          <Route path="/reports" element={<Home page="reports" />} />
          <Route path="/history" element={<Home page="history" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

