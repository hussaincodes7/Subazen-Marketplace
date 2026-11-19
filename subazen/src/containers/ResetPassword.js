import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MaterialButton, MaterialInput } from "../components/MaterialUI";
import Layout from "../components/Layout";
import axios from "../helpers/axios";
import usePageMeta from "../hooks/usePageMeta";
import "./ResetPassword.css";

export default function ResetPassword() {
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get("token") || "", [location.search]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  usePageMeta({ title: "Reset your password | Subazen", description: "Choose a new password for your Subazen account.", canonical: `${window.location.origin}/reset-password`, robots: "noindex, nofollow" });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) return setError("This reset link is missing or invalid. Request a new one from login.");
    if (password.length < 8) return setError("Choose a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setLoading(true);
    try {
      const response = await axios.post("/reset-password", { token, password });
      setMessage(response.data?.message || "Your password has been reset. You can now sign in.");
      window.history.replaceState(window.history.state, "", "/reset-password");
      setPassword("");
      setConfirmation("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not reset your password. Request a new link and try again.");
    } finally {
      setLoading(false);
    }
  };

  return <Layout>
    <main className="reset-password-page">
      <section className="reset-password-card">
        <span className="reset-password-eyebrow">SUBAZEN ACCOUNT</span>
        <h1>Choose a new password</h1>
        <p>Set a new password for your account. Reset links expire after 30 minutes and can only be used once.</p>
        {message ? <div className="reset-password-success" role="status">
          <strong>Password updated</strong>
          <span>{message}</span>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("subazen:open-auth", { detail: { mode: "login" } }))}>Sign in to Subazen</button>
        </div> : <form noValidate onSubmit={submit}>
          <MaterialInput type="password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={8} maxLength={72} />
          <MaterialInput type="password" label="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={8} maxLength={72} />
          {error && <div className="reset-password-error" role="alert">{error}</div>}
          <MaterialButton type="submit" title={loading ? "Updating…" : "Update password"} bgColor="#2874f0" textColor="#fff" style={{ marginTop: "1.25rem" }} disabled={loading} />
        </form>}
      </section>
    </main>
  </Layout>;
}
