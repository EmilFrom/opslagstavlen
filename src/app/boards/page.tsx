"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BoardCard } from "@/components/BoardCard";
import type { Board } from "@/types/planka";

type BoardsResponse =
  | { items?: Board[] }
  | Board[]
  | {
      error?: string;
    };

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchBoards = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/boards", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/");
          return;
        }

        const data = (await response.json()) as BoardsResponse;

        if (!response.ok) {
          setErrorMessage(
            "error" in data && data.error
              ? data.error
              : "Kunne ikke hente tavler.",
          );
          return;
        }

        const nextBoards = Array.isArray(data)
          ? data
          : "items" in data && Array.isArray(data.items)
            ? data.items
            : [];

        setBoards(nextBoards);
      } catch {
        setErrorMessage("Netværksfejl. Prøv igen.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBoards();
  }, [router]);

  return (
    <main className="h-full overflow-y-auto px-4 pb-8 pt-6">
      <header className="mb-6">
        <p className="text-sm font-medium text-slate-600">Opslagstavlen</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dine Tavler</h1>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-3xl bg-white/70" />
          <div className="h-24 animate-pulse rounded-3xl bg-white/70" />
          <div className="h-24 animate-pulse rounded-3xl bg-white/70" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 text-sm text-slate-700">
          Ingen tavler fundet endnu.
        </div>
      ) : (
        <section className="space-y-3">
          {boards.map((board, index) => (
            <BoardCard key={board.id} board={board} index={index} />
          ))}
        </section>
      )}
    </main>
  );
}
