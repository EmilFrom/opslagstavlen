"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Login mislykkedes.");
        return;
      }

      router.replace("/boards/1753252978711594001");
      router.refresh();
    } catch {
      setErrorMessage("Netværksfejl. Prøv igen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex h-full items-center justify-center px-4">
      <section className="w-full rounded-3xl border border-white/40 bg-white/10 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
        <header className="mb-6 space-y-2">
          <p className="text-sm font-medium text-slate-700/90 dark:text-gray-400">Velkommen tilbage</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Opslagstavlen</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Brugernavn</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="next"
              required
              className="h-13 w-full rounded-2xl border border-white/60 bg-white/80 px-4 text-base text-slate-900 outline-none ring-sky-300/70 transition focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
              placeholder="Indtast brugernavn"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Adgangskode</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              className="h-13 w-full rounded-2xl border border-white/60 bg-white/80 px-4 text-base text-slate-900 outline-none ring-sky-300/70 transition focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
              placeholder="••••••••"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex h-13 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60 dark:bg-white/10 dark:text-white"
          >
            {isSubmitting ? "Logger ind..." : "Log ind"}
          </button>
        </form>
      </section>
    </main>
  );
}
