"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error logging in ");
    } else {
      router.push("/");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <label htmlFor="email" style={{ display: "block", marginTop: 12 }}>
        Email
      </label>
      <input
        id="email"
        name="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />
      <label htmlFor="password" style={{ display: "block", marginTop: 12 }}>
        Password
      </label>
      <input
        id="password"
        name="password"
        autoComplete="current-password"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}