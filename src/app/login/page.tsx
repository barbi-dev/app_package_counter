"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Completa tu correo y contraseña.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Correo o contraseña incorrectos.");
    } else {
      router.push("/");
    }
  };

  return (
    <main className="appShell loginShell">
      <div className="bgBlob bgBlob1" />
      <div className="bgBlob bgBlob2" />
      <div className="bgBlob bgBlob3" />

      <section className="loginSurface">
        <div className="loginBrand">
          <div className="loginLogoWrap">
            <Image
              src="/logo.png"
              alt="GalexShop"
              width={72}
              height={72}
              className="loginLogo"
              priority
            />
          </div>

          <div className="loginBrandText">
            <span className="loginEyebrow">Sistema privado</span>
            <h1 className="loginTitle">Iniciar sesión</h1>
            <p className="loginText">
              Accede al panel para registrar paquetes, revisar historial y gestionar clientes.
            </p>
          </div>
        </div>

        <div className="loginForm">
          <div className="inputWrap">
            <label htmlFor="email" className="inputLabel">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              autoComplete="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="loginInput"
            />
          </div>

          <div className="inputWrap">
            <label htmlFor="password" className="inputLabel">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="loginInput"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            className="proPrimaryBtn loginBtn"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {errorMsg ? (
            <div className="feedbackBadge feedbackError loginFeedback">
              {errorMsg}
            </div>
          ) : (
            <div className="loginHint">Acceso exclusivo para operadores autorizados.</div>
          )}
        </div>
      </section>
    </main>
  );
}