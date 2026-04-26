"use client";

import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { Card, Label, List } from "@/types/planka";

type BoardPayloadResponse = {
  lists?: List[];
  cards?: Card[];
  labels?: Label[];
  error?: string;
};

const LIST_TINTS = [
  "from-rose-100/90 to-pink-100/70",
  "from-sky-100/90 to-blue-100/70",
  "from-emerald-100/90 to-teal-100/70",
  "from-violet-100/90 to-indigo-100/70",
  "from-amber-100/90 to-orange-100/70",
];

export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();

  const boardId = useMemo(() => {
    const raw = params?.boardId;
    if (!raw) {
      return "";
    }

    return Array.isArray(raw) ? raw[0] ?? "" : raw;
  }, [params]);

  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!boardId) {
      return;
    }

    const fetchBoardPayload = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/boards/${boardId}/cards`, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/");
          return;
        }

        const rawText = await response.text();
        const data = rawText
          ? (JSON.parse(rawText) as BoardPayloadResponse)
          : ({} as BoardPayloadResponse);

        if (!response.ok) {
          setErrorMessage(
            data.error ?? rawText ?? "Kunne ikke hente kategorier.",
          );
          return;
        }

        setLists(Array.isArray(data.lists) ? data.lists : []);
      } catch {
        setErrorMessage("Netværksfejl. Prøv igen.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBoardPayload();
  }, [boardId, router]);

  const validLists = lists.filter((list) => {
    const hasName = Boolean(list.name && list.name.trim() !== "");
    const isArchived =
      "isArchived" in (list as unknown as Record<string, unknown>)
        ? Boolean((list as unknown as { isArchived?: boolean }).isArchived)
        : false;

    return hasName && !isArchived;
  });

  const normalize = (value: string) => value.trim().toLowerCase();
  const preferredUsers = ["emil", "coline"];

  const preferredLists = preferredUsers
    .map((user) => validLists.find((list) => normalize(list.name) === user))
    .filter((list): list is List => Boolean(list));

  const displayLists = preferredLists.length === 2 ? preferredLists : validLists;

  return (
    <main className="relative flex h-full flex-col overflow-hidden px-2 pb-6 pt-5 sm:px-4 md:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-700 dark:text-gray-200"
          aria-label="Tilbage"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-300">Board</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Vælg person</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="grid h-full grid-rows-2 gap-4">
            <div className="animate-pulse rounded-[2rem] bg-white/70 dark:bg-white/10" />
            <div className="animate-pulse rounded-[2rem] bg-white/70 dark:bg-white/10" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : displayLists.length === 0 ? (
          <div className="rounded-3xl border border-white/70 bg-white/70 p-5 text-sm text-slate-700 dark:border-white/10 dark:bg-neutral-800/60 dark:text-gray-300">
            Ingen kategorier fundet i denne tavle.
          </div>
        ) : (
          <section
            className={displayLists.length === 2 ? "grid h-full grid-rows-2 gap-4" : "space-y-3"}
          >
            {displayLists.map((list, index) => {
              const listName = normalize(list.name);
              const tint =
                listName === "emil"
                  ? "from-sky-100/90 to-indigo-100/80"
                  : listName === "coline"
                    ? "from-rose-100/90 to-fuchsia-100/80"
                    : LIST_TINTS[index % LIST_TINTS.length];

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => router.push(`/boards/${boardId}/lists/${list.id}`)}
                  className={`w-full rounded-[2rem] border border-white/70 bg-gradient-to-br ${tint} p-6 text-left shadow-md backdrop-blur-sm transition active:scale-[0.99] ${displayLists.length === 2 ? "h-full" : ""}`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                      {list.name}
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-600 dark:text-gray-400">Tryk for at åbne</p>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
