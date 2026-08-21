"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 overflow-auto">
        <Header />

        {children}
      </main>
    </div>
  );
}