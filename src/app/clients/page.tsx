"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Client = {
  code: string;
  client_name: string;
  counter: number;
};

export default function ClientsPage() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [code, setCode] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
    const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  //  cargar clientes
    const fetchClients = async () => {
    setLoading(true);

    const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
    } else {
        setClients(data ?? []);
    }

    setLoading(false);
    };

    useEffect(() => {
    const run = async () => {
        await fetchClients();
    };

    run();
    }, []);


  // registrar cliente
  const handleCreate = async () => {
    setStatusMsg("");

    if (!clientName.trim() || !code.trim()) {
      setStatusMsg("Completa todos los campos.");
      return;
    }

    // validar duplicado (UX)
    const exists = clients.find((c) => c.code === code.trim());
    if (exists) {
      setStatusMsg("Ese código ya existe.");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        client_name: clientName.trim(),
        code: code.trim(),
        counter: 0,
      },
    ]);

    if (error) {
      setStatusMsg("Error al registrar cliente.");
      return;
    }

    setStatusMsg("Cliente registrado");
    setClientName("");
    setCode("");

    await fetchClients();
  };

  return (
    <main className="appShell">
      {/* DRAWER */}
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
                router.push("/summary");
              }}
              className="mobileNavItem"
            >
              Resumen
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
      <section className="registerSurface">
        <h1 className="heroTitle">Añadir nuevo cliente</h1>
        <p className="heroText">
          Añade nuevos clientes para usar en el sistema.
        </p>

        {/* FORM */}
        <div className="registerPanel">
          <div className="inputWrap">
            <label className="inputLabel">Nombre</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="proInput"
              placeholder="Nombre Apellido"
            />
          </div>

          <div className="inputWrap">
            <label className="inputLabel">Código</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="proInput"
              placeholder="777"
            />
          </div>

          <button className="proPrimaryBtn" onClick={handleCreate}>
            Guardar
          </button>
        </div>

        {statusMsg && (
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            {statusMsg}
          </div>
        )}

      <section className="secondaryActions">
        <button
          className="secondaryBtn secondaryGradient"
          onClick={() => router.push("/summary")}
        >
          Resumen diario
        </button>
        <button
          className="secondaryBtn secondaryGhost"
          onClick={() => router.push("/")}
        >
          Registrar
        </button>
        <button
          className="secondaryBtn secondaryGhost"
          onClick={() => router.push("/history")}
        >
          Historial
        </button>

        

        <button className="secondaryBtn secondaryLight" onClick={handleLogout}>
          Salir
        </button>
      </section>

        <div style={{ marginTop: 30 }}>
            <h3 className="historySectionTitle">Clientes registrados</h3>

            {loading ? (
                <div className="historyStatusCard">Cargando clientes…</div>
            ) : (
                <div className="summaryGrid">
                {clients.map((c) => (
                    <div key={c.code} className="summaryCard">
                    <div className="summaryCode">{c.code}</div>
                    <div>{c.client_name}</div>
                    <div className="summaryTotal">{c.counter}</div>
                    </div>
                ))}
                </div>
            )}
            </div>

      </section>
    </main>
  );
}