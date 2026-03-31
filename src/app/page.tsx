"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
  <main className="appShell">
    <div className="bgBlob bgBlob1" />
    <div className="bgBlob bgBlob2" />
    <div className="bgBlob bgBlob3" />

    <section className="registerSurface">
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
                router.push("/history");
              }}
              className="mobileNavItem"
            >
              Historial
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
      
      

      <section className="heroBlock">
        <h1 className="heroTitle">Registrar paquete</h1>
        <p className="heroText">
          Escribe el código y presiona <strong>Enter</strong> o toca <strong>Registrar</strong>.
        </p>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <span className="statLabel">Total hoy</span>
          <strong className="statValue">
            {dashLoading ? "…" : totalToday}
          </strong>
        </article>

        <article className="statCard">
          <span className="statLabel">Último cliente registrado</span>
          <strong className="statValue statValueSm">
            {dashLoading ? "…" : lastLog?.client_name ?? "—"}
          </strong>
        </article>

        <article className="statCard">
          <span className="statLabel">Hora del último registro</span>
          <strong className="statValue statValueSm">
            {dashLoading ? "…" : lastTime}
          </strong>
        </article>
      </section>

      <section className="registerPanel">
        <div className="inputWrap">
          <label className="inputLabel" htmlFor="package-code">
            Código del cliente
          </label>

          <input
            id="package-code"
            ref={inputRef}
            className={`proInput ${status === "error" ? "proInputError" : ""}`}
            placeholder="Ej. 303"
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
            autoComplete="off"
          />
        </div>

        <button
          className="proPrimaryBtn"
          onClick={handleRegister}
          disabled={loading}
        >
          <span>{loading ? "Registrando..." : "Registrar"}</span>
        </button>
      </section>

      <div className="feedbackRow" aria-live="polite">
        {message ? (
          <div
            className={`feedbackBadge ${
              status === "success"
                ? "feedbackSuccess"
                : status === "error"
                ? "feedbackError"
                : ""
            }`}
          >
            {message}
          </div>
        ) : (
          <div className="feedbackPlaceholder" />
        )}
      </div>

      <section className="secondaryActions">
        <button
          className="secondaryBtn secondaryGradient"
          onClick={() => router.push("/summary")}
        >
          Resumen diario
        </button>
                <button
          className="secondaryBtn secondaryGhost"
          onClick={() => router.push("/history")}
        >
          Historial
        </button>
        <button
          className="secondaryBtn secondaryGhost"
          onClick={() => router.push("/clients")}
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