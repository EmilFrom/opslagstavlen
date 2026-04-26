"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Plus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TaskCard } from "@/components/TaskCard";
import type { Card, CardLabel, Label, List } from "@/types/planka";

type BoardPayloadResponse = {
  lists?: List[];
  cards?: Card[];
  labels?: Label[];
  cardLabels?: CardLabel[];
  error?: string;
};

export default function ListDetailPage() {
  const params = useParams<{ boardId: string; listId: string }>();
  const router = useRouter();

  const boardId = useMemo(() => {
    const raw = params?.boardId;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [params]);

  const listId = useMemo(() => {
    const raw = params?.listId;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [params]);

  const [cards, setCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [cardLabels, setCardLabels] = useState<CardLabel[]>([]);
  const [listName, setListName] = useState("Kategori");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");

  const fetchBoardPayload = useCallback(async () => {
    if (!boardId || !listId) {
      return;
    }

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
          setErrorMessage(data.error ?? rawText ?? "Kunne ikke hente kort.");
          return;
        }

        const allCards = Array.isArray(data.cards) ? data.cards : [];
        const filteredCards = allCards.filter((card) => card.listId === listId);
        const availableLabels = Array.isArray(data.labels) ? data.labels : [];
        const availableCardLabels = Array.isArray(data.cardLabels) ? data.cardLabels : [];
        const availableLists = Array.isArray(data.lists) ? data.lists : [];
        const selectedList = availableLists.find((list) => list.id === listId);

        setCards(filteredCards);
        setLabels(availableLabels);
        setCardLabels(availableCardLabels);
        setListName(selectedList?.name ?? "Kategori");
      } catch {
        setErrorMessage("Netværksfejl. Prøv igen.");
      } finally {
        setIsLoading(false);
      }
  }, [boardId, listId, router]);

  useEffect(() => {
    void fetchBoardPayload();
  }, [fetchBoardPayload]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { name?: string; username?: string };
        setCurrentUserName(data.name ?? "");
        setCurrentUsername(data.username?.toLowerCase() ?? "");
      } catch {
        // no-op: swipe can still work with fallback behavior
      }
    };

    void fetchMe();
  }, []);

  const handleArchived = (cardId: string) => {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
    setCardLabels((prev) => prev.filter((relation) => relation.cardId !== cardId));
  };

  const handleCreateCard = async () => {
    if (!boardId || !listId || !createTitle.trim()) {
      setCreateError("Titel er påkrævet.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardId,
          listId,
          name: createTitle.trim(),
          description: createDescription,
        }),
      });

      const rawText = await response.text();
      let data: { error?: string } | null = null;

      try {
        data = rawText ? (JSON.parse(rawText) as { error?: string }) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        setCreateError(data?.error ?? rawText ?? "Kunne ikke oprette opslag.");
        return;
      }

      setCreateTitle("");
      setCreateDescription("");
      setIsCreateOpen(false);
      await fetchBoardPayload();
    } catch {
      setCreateError("Netværksfejl. Prøv igen.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="relative h-full overflow-y-auto px-2 pb-24 pt-5 sm:px-4 md:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/boards/${boardId}`)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-700 dark:text-gray-200"
          aria-label="Tilbage til kategorier"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-300">Kategori</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{listName}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-2xl bg-white/70 dark:bg-white/10" />
          <div className="h-32 animate-pulse rounded-2xl bg-white/70 dark:bg-white/10" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/70 p-5 text-sm text-slate-700 dark:border-white/10 dark:bg-neutral-800/60 dark:text-gray-300">
          Ingen opgaver i denne kategori endnu.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              labels={labels}
              cardLabels={cardLabels}
              currentUserName={currentUserName}
              currentUsername={currentUsername}
              onArchived={handleArchived}
            />
          ))}
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-8 right-8 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.35)] transition active:scale-[0.98] dark:border dark:border-white/10 dark:bg-neutral-700 dark:text-gray-100"
        aria-label="Nyt opslag"
      >
        <Plus className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {isCreateOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateOpen(false)}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-white/60 bg-white/90 px-5 pb-8 pt-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 md:max-w-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Opret opslag"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nyt opslag</h2>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-slate-700 dark:border dark:border-white/10 dark:bg-neutral-700 dark:text-gray-300"
                  aria-label="Luk"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Titel</span>
                  <textarea
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    rows={4}
                    className="w-full min-h-[120px] resize-none rounded-2xl border border-white/60 bg-white/50 p-4 text-lg text-slate-900 outline-none backdrop-blur ring-sky-300/70 transition focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Skriv titel..."
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Beskrivelse</span>
                  <textarea
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    rows={6}
                    className="w-full min-h-[160px] resize-none rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-slate-900 outline-none backdrop-blur ring-sky-300/70 transition focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Skriv beskrivelse..."
                  />
                </label>
              </div>

              {createError ? (
                <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  {createError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleCreateCard()}
                disabled={isCreating}
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60 dark:bg-white/10 dark:text-white"
              >
                {isCreating ? "Opretter..." : "Opret opslag"}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
