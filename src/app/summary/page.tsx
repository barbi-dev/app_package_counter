"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

type DailyRow = {
  code: string;
  total: number;
};

type LogCodeRow = { code: string };

export default function SummaryPage() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date())
  );
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const totalDay = useMemo(
    () => rows.reduce((acc, r) => acc + r.total, 0),
    [rows]
  );
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg("");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from("logs")
        .select("code")
        .eq("is_void", false)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (error) {
        console.error(error);
        setErrorMsg("No se pudo cargar el resumen diario.");
        setRows([]);
        setLoading(false);
        return;
      }

      const typed = (data ?? []) as LogCodeRow[];

      const map = new Map<string, number>();
      for (const item of typed) {
        map.set(item.code, (map.get(item.code) ?? 0) + 1);
      }

      const result: DailyRow[] = Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, total]) => ({ code, total }));

      setRows(result);
      setLoading(false);
    };

    run();
  }, [router, selectedDate]);

  return (
    <main className="appShell">
      <div className="bgBlob bgBlob1" />
      <div className="bgBlob bgBlob2" />
      <div className="bgBlob bgBlob3" />

      {/* BOTÓN HAMBURGUESA */}
      {!mobileMenuOpen && (
        <button
          className="mobileMenuButton"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="menuLine" />
          <span className="menuLine" />
          <span className="menuLine" />
        </button>
      )}

<>
        <div
          className={`mobileDrawerOverlay ${mobileMenuOpen ? "isOpen" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside className={`mobileDrawer ${mobileMenuOpen ? "isOpen" : ""}`}>
          <div className="mobileDrawerClosediv">
            <button
              className="mobileDrawerClose"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              ×
            </button>

          </div>
          <div className="mobileDrawerHeader">
            <div className="mobileBrand">
              <Image
                src="/logo.png"
                alt="GalexShop"
                width={52}
                height={52}
                className="mobileLogo"
                priority
              />
              <span className="mobileBrandName">GalexShop</span>
            </div>

          </div>

          <nav className="mobileNav">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                router.push("/");
              }}
              className="mobileNavItem"
            >
              Registrar
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                router.push("/history");
              }}
              className="mobileNavItem"
            >
              Historial
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                router.push("/clients");
              }}
              className="mobileNavItem"
            >
              Nuevo Cliente
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="mobileNavItem mobileLogout"
            >
              Salir
            </button>
          </nav>
        </aside>
      </>

      {/* CONTENIDO */}
      <section className="registerSurface historySurface">
        <header className="historyHero">
          <div>
            <div className="historyEyebrow">GalexShop · Resumen</div>
            <h1 className="heroTitle">Resumen diario</h1>
            <p className="heroText">
              Visualiza el total de paquetes por código en el día seleccionado.
            </p>
          </div>
        </header>

        {/* TOOLBAR */}
        <section className="historyToolbar">
          <div className="historyDateCard">
            <label className="inputLabel">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="historyDateInput"
            />
          </div>

          <button
            className="secondaryBtn secondaryGradient"
            onClick={() => setSelectedDate(toDateInputValue(new Date()))}
          >
            Hoy
          </button>
        </section>

        {/* KPI */}
        <section className="statsGrid">
          <article className="statCard">
            <span className="statLabel">Total del día</span>
            <strong className="statValue">
              {loading ? "…" : totalDay}
            </strong>
          </article>
        </section>

        {/* GRID */}
        {!loading && !errorMsg && (
          <section className="historyCards">
            <div className="historySectionTitle">
              Paquetes por código
            </div>

            <div className="summaryGrid">
              {rows.map((row) => (
                <div key={row.code} className="summaryCard">
                  <div className="summaryCode">{row.code}</div>
                  <div className="summaryTotal">{row.total}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="secondaryActions">

          <button
            className="secondaryBtn secondaryGradient"
            onClick={() => router.push("/")}
          >
            Registrar
          </button>

          <button
            className="secondaryBtn secondaryGhost"
            onClick={() => router.push("/")}
          >
            Nuevo Cliente
          </button>

          <button className="secondaryBtn secondaryLight" onClick={handleLogout}>
            Salir
          </button>
        </section>
      </section>
    </main>
  );
}