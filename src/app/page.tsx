"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type RpcRow = {
  ok: boolean;
  message: string | null;
  code: string | null;
  client_name: string | null;
  assigned_number: number | null;
  total: number | null;
};

type Status = "idle" | "success" | "error";

type LastLog = {
  client_name: string;
  created_at: string;
};

function startOfTodayISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

function startOfTomorrowISO() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.toISOString();
}

export default function Home() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [totalToday, setTotalToday] = useState<number>(0);
  const [lastLog, setLastLog] = useState<LastLog | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // Anti doble click (misma acción dentro de 1 segundo)
  const lastSubmitRef = useRef<{ ts: number; code: string } | null>(null);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  // Autofocus al cargar
  useEffect(() => {
    focusInput();
  }, []);

  // Protección: si no hay usuario logueado -> /login
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/login");
    };
    checkUser();
  }, [router]);

  // Cargar mini dashboard (Total hoy + último registro del día)
  const refreshDashboard = async () => {
    setDashLoading(true);

    const start = startOfTodayISO();
    const end = startOfTomorrowISO();

    // Total de hoy (count exact, sin traer filas)
    const { count, error: countErr } = await supabase
      .from("logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", end);

    if (countErr) {
      console.error(countErr);
    } else {
      setTotalToday(count ?? 0);
    }

    // Último registro de hoy
    const { data: lastData, error: lastErr } = await supabase
      .from("logs")
      .select("client_name, created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastErr) {
      console.error(lastErr);
      setLastLog(null);
    } else {
      setLastLog(lastData?.[0] ?? null);
    }

    setDashLoading(false);
  };

useEffect(() => {
  let cancelled = false;

  const load = async () => {
    // Llama a refreshDashboard, pero evita setState si el componente se desmonta
    await refreshDashboard();
  };

  // Evita el warning del linter (no “sincrónico” directo)
  Promise.resolve().then(() => {
    if (!cancelled) load();
  });

  return () => {
    cancelled = true;
  };
}, []);

  const msgClass =
    status === "success" ? "badgeOk" : status === "error" ? "badgeErr" : "";

  const handleRegister = async () => {
    const trimmed = code.trim();

    // Validación: no vacío
    if (!trimmed) {
      setStatus("error");
      setMessage("Ingresa un código antes de registrar.");
      focusInput();
      return;
    }

    // Anti doble click: mismo código en < 1s
    const now = Date.now();
    const last = lastSubmitRef.current;
    if (last && last.code === trimmed && now - last.ts < 1000) {
      // lo ignoramos silenciosamente (o podrías mostrar un mensaje corto)
      return;
    }
    lastSubmitRef.current = { ts: now, code: trimmed };

    setLoading(true);
    setStatus("idle");
    setMessage("");

    const { data, error } = await supabase.rpc("register_package", {
      p_code: trimmed,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setStatus("error");
      setMessage("Error del sistema. Revisa consola.");
      focusInput();
      return;
    }

    const row = (data?.[0] as RpcRow | undefined);

    if (!row) {
      setStatus("error");
      setMessage("No hubo respuesta del servidor.");
      focusInput();
      return;
    }

    if (!row.ok) {
      setStatus("error");
      setMessage(row.message ?? "Código no registrado. Verifique.");
      focusInput();
      return;
    }

    // OK
    setStatus("success");
    setMessage(
      `${row.message} Consecutivo: ${row.assigned_number}. Total: ${row.total}.`
    );

    setCode("");
    focusInput();

    // Refrescar dashboard para que se actualice total y último registro
    refreshDashboard();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const lastTime = useMemo(() => {
    if (!lastLog) return "—";
    return new Date(lastLog.created_at).toLocaleTimeString();
  }, [lastLog]);

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1 style={{ marginBottom: 8 }}>Registrar paquete</h1>
      <p style={{ marginTop: 0, color: "var(--muted)" }}>
        Escribe el código y presiona <b>Enter</b> o “Registrar”.
      </p>

      {/* Mini dashboard */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div style={{ minWidth: 180 }}>
            <div style={{ color: "var(--muted)" }}>Total hoy</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>
              {dashLoading ? "…" : totalToday}
            </div>
          </div>

          <div style={{ minWidth: 260 }}>
            <div style={{ color: "var(--muted)" }}>Último cliente registrado</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {dashLoading ? "…" : lastLog?.client_name ?? "—"}
            </div>
          </div>

          <div style={{ minWidth: 180 }}>
            <div style={{ color: "var(--muted)" }}>Hora del último registro</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {dashLoading ? "…" : lastTime}
            </div>
          </div>
        </div>
      </div>

      {/* Registro */}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <input
          ref={inputRef}
          className={`inputLarge ${status === "error" ? "inputError" : ""}`}
          placeholder="Código"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMessage("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRegister();
          }}
          inputMode="numeric"
        />

        <button
          className="btn btnPrimary"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Registrando..." : "Registrar"}
        </button>
      </div>

      <div style={{ marginTop: 14, minHeight: 24 }}>
        {message && <div className={msgClass}>{message}</div>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button className="btn btnAccent" onClick={() => router.push("/history")}>
          Ver historial
        </button>
        <button className="btn btnPrimary" onClick={() => router.push("/summary")}>
          Resumen diario
        </button>
        <button className="btn" onClick={handleLogout}>
          Salir
        </button>
      </div>
    </div>
  );
}