"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export default function AccountPage() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const claimedMessage = useMemo(() => {
    if (searchParams.get("claimed") === "1") {
      return "Account claimed successfully.";
    }
    const claimError = searchParams.get("claimError");
    return claimError ? decodeURIComponent(claimError) : "";
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/account/me", { cache: "no-store" })
      .then(safeJson)
      .then((data) => setAccount(data?.account ?? null))
      .catch(() => setAccount(null));
  }, []);

  const requestClaimLink = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage("");
    setPreviewUrl("");

    try {
      const response = await fetch("/api/account/claim/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await safeJson(response);
      if (!response.ok) {
        throw new Error(json?.error ?? "Unable to send claim link.");
      }

      setStatusMessage(`Claim link prepared for ${json?.email ?? email}.`);
      if (json?.previewUrl) {
        setPreviewUrl(json.previewUrl);
      }
    } catch (error) {
      setStatusMessage(error?.message ?? "Unable to send claim link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-xl rounded-3xl bg-white/35 p-6 shadow-xl ring-1 ring-white/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              Settlex account
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {account?.currentUsername ?? "Guest"}
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              {account
                ? account.status === "claimed"
                  ? "This account is claimed."
                  : "Add an email to claim this account on another device."
                : "Pick a username in the lobby first to create your guest account."}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-white/70"
          >
            Back
          </Link>
        </div>

        {claimedMessage ? (
          <div className="mt-4 rounded-2xl bg-lime-100 px-4 py-3 text-sm text-lime-800 ring-1 ring-lime-200">
            {claimedMessage}
          </div>
        ) : null}

        {account ? (
          <form onSubmit={requestClaimLink} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="ada@example.com"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-lime-500 px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isSubmitting ? "Preparing link…" : "Send claim link"}
            </button>
          </form>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-white/70">
            {statusMessage}
          </div>
        ) : null}

        {previewUrl ? (
          <div className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Local/dev preview:
            {" "}
            <a className="underline" href={previewUrl}>
              open magic link
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
