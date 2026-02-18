"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type LogRow = {
  id: number;
  created_at: string;
  code: string;
  client_name: string;
  assigned_number: number;
  user_id: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function HistoryPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toDateInputValue(new Date())
  );

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const totalDay = logs.length;

  // Totales por cliente en el día
  const totalsByClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of logs) {
      m.set(row.client_name, (m.get(row.client_name) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([client_name, total]) => ({ client_name, total }));
  }, [logs]);

  // Último registro del día (para mostrar en KPI)
  const lastLog = useMemo(() => {
    if (logs.length === 0) return null;
    const newest = logs[0]; // ya vienen ordenados desc
    return newest;
  }, [logs]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg("");

      // Proteger ruta
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      // Rango del día [00:00, 00:00 del día siguiente)
      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from("logs")
        .select("id, created_at, code, client_name, assigned_number, user_id")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setErrorMsg("No se pudo cargar el historial para esa fecha.");
        setLogs([]);
      } else {
        setLogs((data ?? []) as LogRow[]);
      }

      setLoading(false);
    };

    run();
  }, [router, selectedDate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{ padding: 40, maxWidth: 980 }}>
      <h1 style={{ marginBottom: 8 }}>Historial por día</h1>
      <p style={{ marginTop: 0, color: "var(--muted)" }}>
        Selecciona una fecha para ver registros y totales.
      </p>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginTop: 14 }}>
        <button className="btn btnAccent" onClick={() => router.push("/")}>
          Volver
        </button>

        <button className="btn" onClick={handleLogout}>
          Salir
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label className="label" htmlFor="history-date">
            Fecha:
          </label>
          <input
            id="history-date"
            name="history-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="inputSmall"
            style={{ width: 170, padding: 10 }}
          />
        </div>

        <button
          className="btn btnPrimary"
          onClick={() => setSelectedDate(toDateInputValue(new Date()))}
        >
          Hoy
        </button>
      </div>

      {/* Resumen / KPIs */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="kpiGrid">
          <div className="kpi">
            <div className="kpiTitle">Total del día</div>
            <div className="kpiValue">{loading ? "…" : totalDay}</div>
          </div>

          <div className="kpi">
            <div className="kpiTitle">Último cliente (del día)</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {loading ? "…" : lastLog?.client_name ?? "—"}
            </div>
          </div>

          <div className="kpi">
            <div className="kpiTitle">Hora del último registro</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {loading
                ? "…"
                : lastLog
                ? new Date(lastLog.created_at).toLocaleTimeString()
                : "—"}
            </div>
          </div>
        </div>

        {/* Chips por cliente */}
        {!loading && totalsByClient.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Total por cliente (día)
            </div>
            <div className="chips">
              {totalsByClient.map((x) => (
                <div key={x.client_name} className="chip">
                  <b>{x.client_name}:</b> {x.total}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Estado */}
      {loading && <p style={{ marginTop: 14 }}>Cargando…</p>}
      {errorMsg && <p style={{ marginTop: 14, color: "var(--danger)" }}>{errorMsg}</p>}

      {/* Desktop table */}
      {!loading && !errorMsg && (
        <>
          <div className="tableWrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Número asignado</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 16 }}>
                      No hay registros para esta fecha.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td>{log.code}</td>
                      <td style={{ fontWeight: 800 }}>{log.client_name}</td>
                      <td>{log.assigned_number}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="cardList" style={{ marginTop: 16 }}>
            {logs.length === 0 ? (
              <div className="logCard">No hay registros para esta fecha.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="logCard">
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {log.client_name}
                  </div>

                  <div className="logRow">
                    <div className="logKey">Hora</div>
                    <div className="logVal">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="logRow">
                    <div className="logKey">Código</div>
                    <div className="logVal">{log.code}</div>
                  </div>

                  <div className="logRow">
                    <div className="logKey">Número</div>
                    <div className="logVal">{log.assigned_number}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}