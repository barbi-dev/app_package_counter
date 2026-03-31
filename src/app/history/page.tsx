"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type LogRow = {
  id: number;
  created_at: string;
  code: string;
  client_name: string;
  assigned_number: number;
  user_id: string | null;
  is_void: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function HistoryPage() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toDateInputValue(new Date())
  );

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const totalDay = logs.filter((r) => !r.is_void).length;

  const totalsByClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of logs) {
      if (row.is_void) continue;
      m.set(row.client_name, (m.get(row.client_name) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([client_name, total]) => ({ client_name, total }));
  }, [logs]);

  const lastLog = useMemo(() => {
    if (logs.length === 0) return null;
    return logs[0];
  }, [logs]);

  const fetchLogsForSelectedDate = useCallback(async (dateStr: string) => {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { data, error } = await supabase
      .from("logs")
      .select("id, created_at, code, client_name, assigned_number, user_id, is_void")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LogRow[];
  }, []);

  const handleVoid = async (id: number) => {
    const ok = window.confirm(
      "¿Anular este registro? No contará en los totales del día."
    );
    if (!ok) return;

    const { error } = await supabase.rpc("void_log", { p_id: id });
    if (error) {
      alert("Error anulando: " + error.message);
      return;
    }

    try {
      const rows = await fetchLogsForSelectedDate(selectedDate);
      setLogs(rows);
    } catch (e) {
      console.error(e);
      alert("Se anuló, pero no se pudo refrescar el historial.");
    }
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

      try {
        const rows = await fetchLogsForSelectedDate(selectedDate);
        setLogs(rows);
      } catch (err) {
        console.error(err);
        setErrorMsg("No se pudo cargar el historial para esa fecha.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, selectedDate, fetchLogsForSelectedDate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const lastTime = useMemo(() => {
    if (!lastLog) return "—";
    return new Date(lastLog.created_at).toLocaleTimeString("es-EC", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastLog]);

  return (
    <main className="appShell">
      <div className="bgBlob bgBlob1" />
      <div className="bgBlob bgBlob2" />
      <div className="bgBlob bgBlob3" />

      {!mobileMenuOpen && (
        <button
          type="button"
          className="mobileMenuButton"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú"
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
                router.push("/summary");
              }}
              className="mobileNavItem"
            >
              Resumen
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

      <section className="registerSurface historySurface">
        <header className="historyHero">
          <div>
            <div className="historyEyebrow">GalexShop · Historial</div>
            <h1 className="heroTitle">Historial por día</h1>
            <p className="heroText">
              Selecciona una fecha para ver registros, totales y anulaciones del día.
            </p>
          </div>

          <div className="historyTopActions desktopOnly">
            <button
              className="secondaryBtn secondaryGhost"
              onClick={() => router.push("/")}
            >
              Volver
            </button>
            <button
              className="secondaryBtn secondaryGradient"
              onClick={() => router.push("/summary")}
            >
              Resumen diario
            </button>
            <button className="secondaryBtn secondaryLight" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        <section className="historyToolbar">
          <div className="historyDateCard">
            <label className="inputLabel" htmlFor="history-date">
              Fecha
            </label>
            <input
              id="history-date"
              name="history-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="historyDateInput"
            />
          </div>

          <button
            className="secondaryBtn secondaryGradient historyTodayBtn"
            onClick={() => setSelectedDate(toDateInputValue(new Date()))}
          >
            Hoy
          </button>
        </section>

        <section className="statsGrid historyStats">
          <article className="statCard">
            <span className="statLabel">Total del día</span>
            <strong className="statValue">{loading ? "…" : totalDay}</strong>
          </article>

          <article className="statCard">
            <span className="statLabel">Último cliente</span>
            <strong className="statValue statValueSm">
              {loading ? "…" : lastLog?.client_name ?? "—"}
            </strong>
          </article>

          <article className="statCard">
            <span className="statLabel">Hora del último registro</span>
            <strong className="statValue statValueSm">{loading ? "…" : lastTime}</strong>
          </article>
        </section>

        {!loading && totalsByClient.length > 0 && (
          <section className="historyChipBlock">
            <div className="historySectionTitle">Totales por cliente</div>
            <div className="historyChipWrap">
              {totalsByClient.map((x) => (
                <div key={x.client_name} className="historyChip">
                  <span className="historyChipName">{x.client_name}</span>
                  <span className="historyChipCount">{x.total}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && <div className="historyStatusCard">Cargando historial…</div>}
        {errorMsg && <div className="historyErrorCard">{errorMsg}</div>}

        {!loading && !errorMsg && (
          <>
            <section className="historyTableCard desktopTableOnly">
              <div className="historySectionTitle">Registros del día</div>

              <div className="historyTableWrap">
                <table className="historyTable">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Código</th>
                      <th>Cliente</th>
                      <th>Número</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="historyEmptyCell">
                          No hay registros para esta fecha.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            {new Date(log.created_at).toLocaleTimeString("es-EC", {
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td>{log.code}</td>
                          <td className="historyClientCell">{log.client_name}</td>
                          <td>{log.assigned_number}</td>
                          <td>
                            {log.is_void ? (
                              <span className="historyPillVoid">Anulado</span>
                            ) : (
                              <button
                                className="historyDangerBtn"
                                onClick={() => handleVoid(log.id)}
                              >
                                Anular
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="historyCards mobileCardsOnly">
              <div className="historySectionTitle">Registros del día</div>

              {logs.length === 0 ? (
                <div className="historyLogCard">No hay registros para esta fecha.</div>
              ) : (
                logs.map((log) => (
                  <article key={log.id} className="historyLogCard">
                    <div className="historyLogHead">
                      <div className="historyLogClient">{log.client_name}</div>
                      {log.is_void ? (
                        <span className="historyPillVoid">Anulado</span>
                      ) : (
                        <button
                          className="historyDangerBtn"
                          onClick={() => handleVoid(log.id)}
                        >
                          Anular
                        </button>
                      )}
                    </div>

                    <div className="historyLogGrid">
                      <div className="historyLogItem">
                        <span className="historyLogKey">Hora</span>
                        <span className="historyLogVal">
                          {new Date(log.created_at).toLocaleTimeString("es-EC", {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="historyLogItem">
                        <span className="historyLogKey">Código</span>
                        <span className="historyLogVal">{log.code}</span>
                      </div>

                      <div className="historyLogItem">
                        <span className="historyLogKey">Número</span>
                        <span className="historyLogVal">{log.assigned_number}</span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}