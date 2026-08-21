"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, MapPin, X, ArrowRight } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

interface SearchHistory {
  id: string;
  from: string;
  to: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [showNotif, setShowNotif] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor status Auth user
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubAuth();
  }, []);

  // Fetch riwayat pencarian dari Firestore
  useEffect(() => {
    if (!user) {
      setSearchHistory([]);
      return;
    }

    const q = query(
      collection(db, "search_history"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubFirestore = onSnapshot(
      q, 
      (snapshot) => {
        const historyData: SearchHistory[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SearchHistory[];

        setSearchHistory(historyData);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubFirestore();
  }, [user]);

  // Close dropdown saat mengklik area luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };

    if (showNotif) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotif]);

  // Helper format tanggal sederhana
  const formatTime = (createdAt?: SearchHistory["createdAt"]) => {
    if (!createdAt?.seconds) return "Baru saja";
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <header className="flex items-center justify-end mb-6 relative">
      <div className="flex items-center gap-5">
        {/* NOTIFIKASI / LONCENG */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotif((prev) => !prev)}
            className="p-3 rounded-2xl hover:bg-slate-100 transition relative focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            aria-label="Riwayat pencarian"
          >
            <Bell size={20} className="text-slate-600" />
            
            {/* Indicator Badge */}
            {searchHistory.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* POP-UP RIWAYAT PENCARIAN */}
          {showNotif && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">
                  Riwayat Pencarian Rute
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNotif(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* LIST RIWAYAT */}
              <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                {!user ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Silakan Sign In terlebih dahulu.
                  </p>
                ) : searchHistory.length > 0 ? (
                  searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 transition border border-slate-100/80 group"
                    >
                      <div className="p-2 rounded-lg bg-white text-teal-600 border border-slate-100 shadow-sm shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <span className="truncate" title={item.from}>{item.from}</span>
                          <ArrowRight size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate" title={item.to}>{item.to}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Belum ada riwayat pencarian.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="h-8 w-px bg-slate-200" aria-hidden="true" />

        {/* USER INFO */}
        <div className="flex items-center gap-3">
          {/* AVATAR */}
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User avatar"}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-teal-500"
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-500 text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            {/* Status Online */}
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" 
              title="Online"
            />
          </div>

          {/* DETAIL USER */}
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-slate-400 truncate max-w-[150px]">
              {user?.email || "Guest"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}