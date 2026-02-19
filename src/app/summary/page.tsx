"use client";

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
  total: number; // total de paquetes de ESE día para ese código
};
type LogCodeRow = { code: string };

export default function SummaryPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [captureMode, setCaptureMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Total del día (sumatoria de todos los códigos)
  const totalDay = useMemo(() => rows.reduce((acc, r) => acc + r.total, 0), [rows]);

  useEffect(() => {
    // Cambia clase del body para “modo captura”
    document.body.classList.toggle("captureMode", captureMode);
    return () => document.body.classList.remove("captureMode");
  }, [captureMode]);

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

      // Traemos SOLO code (más liviano) y contamos en frontend
        const { data, error } = await supabase
        .from("logs")
        .select("code")
        .eq("is_void", false) 
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

        const typed = (data ?? []) as LogCodeRow[];

      if (error) {
        console.error(error);
        setErrorMsg("No se pudo cargar el resumen diario.");
        setRows([]);
        setLoading(false);
        return;
      }

      const map = new Map<string, number>();
      for (const item of typed) {
        const code = item.code;
        map.set(code, (map.get(code) ?? 0) + 1);
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
    <div className="pageWrap" style={{ padding: 40, maxWidth: 980 }}>
      {/* Toolbar */}
      <div className="toolbar captureHide" style={{ marginBottom: 14 }}>
        <button className="btn btnAccent" onClick={() => router.push("/history")}>
          Volver
        </button>

        <button className="btn btnPrimary" onClick={() => setCaptureMode((v) => !v)}>
          {captureMode ? "Salir modo captura" : "Modo captura"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label className="label" htmlFor="summary-date">
            Fecha:
          </label>
          <input
            id="summary-date"
            name="summary-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input inputSmall"
            style={{ width: 170 }}
          />
        </div>

        <button className="btn" onClick={() => setSelectedDate(toDateInputValue(new Date()))}>
          Hoy
        </button>
      </div>

      {/* Encabezado limpio */}
      <div className="captureHide" style={{ marginBottom: 2 }}>
        <h1 style={{ marginBottom: 2 }}>Resumen diario</h1>
      </div>

      {/* KPIs */}
      <div className="card captureHide" style={{ marginBottom: 2}}>
        <div className="kpiGrid" style={{ gridTemplateColumns: "repeat(2, minmax(180px, 1fr))" }}>
          <div className="kpi">
            <div className="kpiTitle">Total del día (todos)</div>
            <div className="kpiValue">{loading ? "…" : totalDay}</div>
          </div>
        </div>
      </div>

      {loading && <p>Cargando…</p>}
      {errorMsg && <p style={{ color: "var(--danger)" }}>{errorMsg}</p>}

      {/* GRID “capturable” */}
      {!loading && !errorMsg && (
        <div className="summaryGridCard">
          <h3 className="summaryTitle">
            Resumen por código (paquetes del día)
          </h3>

          <div className="summaryGrid">
            {rows.map((row) => (
              <div key={row.code} className="summaryCard">
                <div className="summaryCode">
                  {row.code}
                </div>
                <div className="summaryTotal">
                  {row.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}