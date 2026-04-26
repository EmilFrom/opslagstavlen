"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Archive, CalendarDays, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useLongPress } from "@/hooks/useLongPress";
import type { Card, CardLabel, Label } from "@/types/planka";

interface TaskCardProps {
  card: Card;
  labels: Label[];
  cardLabels: CardLabel[];
  currentUserName?: string;
  currentUsername?: string;
  onArchived?: (cardId: string) => void;
}

export function TaskCard({
  card,
  labels,
  cardLabels,
  currentUserName,
  currentUsername,
  onArchived,
}: TaskCardProps) {
  const [title, setTitle] = useState(card.name ?? "");
  const [description, setDescription] = useState(card.description ?? "");
  const [draftTitle, setDraftTitle] = useState(card.name ?? "");
  const [draftDescription, setDraftDescription] = useState(card.description ?? "");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [optimisticLabelId, setOptimisticLabelId] = useState<string | null>(null);

  useEffect(() => {
    setTitle(card.name ?? "");
    setDescription(card.description ?? "");
    setDraftTitle(card.name ?? "");
    setDraftDescription(card.description ?? "");
  }, [card.description, card.name]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setToastMessage("");
    }, 1800);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const { onTouchStart, onTouchEnd, onTouchCancel } = useLongPress<HTMLDivElement>(
    () => {
      setDraftTitle(title);
      setDraftDescription(description);
      setIsEditOpen(true);
    },
    { delay: 500 },
  );

  const assignedLabelIds = useMemo(() => {
    const ids = cardLabels
      .filter((relation) => relation.cardId === card.id)
      .map((relation) => relation.labelId);

    if (optimisticLabelId && !ids.includes(optimisticLabelId)) {
      ids.push(optimisticLabelId);
    }

    return ids;
  }, [card.id, cardLabels, optimisticLabelId]);

  const assignedLabels = useMemo(
    () => labels.filter((label) => assignedLabelIds.includes(label.id)),
    [assignedLabelIds, labels],
  );

  const userLabelCandidates = useMemo(() => {
    const values = [currentUsername, currentUserName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    return [...new Set(values)];
  }, [currentUserName, currentUsername]);

  const readLabelName = useMemo(() => {
    if (userLabelCandidates.length === 0) {
      return "";
    }

    return `${userLabelCandidates[0]} har læst`;
  }, [userLabelCandidates]);

  const formattedDueDate = useMemo(() => {
    if (!card.dueDate) {
      return "";
    }

    const due = new Date(card.dueDate);

    if (Number.isNaN(due.getTime())) {
      return "";
    }

    return due.toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
    });
  }, [card.dueDate]);

  const handleSwipeLabel = async () => {
    if (userLabelCandidates.length === 0) {
      setToastMessage("Bruger ikke fundet");
      return;
    }

    const normalize = (value: string) => value.trim().toLowerCase();
    const candidateLabelNames = userLabelCandidates.map(
      (candidate) => `${candidate} har læst`,
    );

    const targetLabel = labels.find((label) =>
      candidateLabelNames.some(
        (labelName) => normalize(label.name) === normalize(labelName),
      ),
    );

    if (!targetLabel) {
      setToastMessage("Label ikke fundet");
      return;
    }

    if (assignedLabelIds.includes(targetLabel.id)) {
      setToastMessage("Allerede markeret");
      return;
    }

    try {
      const response = await fetch(`/api/cards/${card.id}/labels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ labelId: targetLabel.id }),
      });

      if (!response.ok) {
        setToastMessage("Kunne ikke sætte label");
        return;
      }

      setOptimisticLabelId(targetLabel.id);
      setToastMessage("Markeret som læst");
    } catch {
      setToastMessage("Netværksfejl");
    }
  };

  const handleArchive = async () => {
    const shouldArchive = window.confirm(
      "Er du sikker på, at du vil arkivere denne post?",
    );

    if (!shouldArchive) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardId: card.boardId,
          listId: "1753252979122635795",
        }),
      });

      if (!response.ok) {
        setToastMessage("Kunne ikke arkivere");
        return;
      }

      setIsEditOpen(false);
      setToastMessage("Arkiveret");
      onArchived?.(card.id);
    } catch {
      setToastMessage("Netværksfejl");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: draftTitle,
          description: draftDescription,
        }),
      });

      if (!response.ok) {
        setToastMessage("Kunne ikke gemme");
        return;
      }

      setTitle(draftTitle);
      setDescription(draftDescription);
      setIsEditOpen(false);
      setToastMessage("Gemt");
    } catch {
      setToastMessage("Netværksfejl");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          if (info.offset.x > 120) {
            void handleSwipeLabel();
          }
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg"
      >
        {assignedLabels.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {assignedLabels.map((label) => (
              <span
                key={label.id}
                className="rounded-full border border-white/90 bg-violet-500/90 px-2.5 py-1 text-xs font-semibold backdrop-blur"
                style={{ color: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        ) : null}

        {formattedDueDate ? (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{formattedDueDate}</span>
          </div>
        ) : null}

        <p className="text-xl font-semibold tracking-tight text-gray-800">
          {title || "Untitled task"}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-base leading-6 text-slate-600">
          {description || "Ingen beskrivelse"}
        </p>
        <p className="mt-4 text-xs font-medium text-slate-400">
          {readLabelName
            ? `Swipe højre for “${readLabelName}” · Hold nede for at redigere`
            : "Swipe højre for læst-label · Hold nede for at redigere"}
        </p>
      </motion.div>

      <AnimatePresence>
        {isEditOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditOpen(false)}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-white/60 bg-white/90 px-5 pb-8 pt-5 shadow-2xl backdrop-blur-xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Rediger opgave"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Rediger opgave</h2>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-slate-700"
                  aria-label="Luk"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Titel</span>
                  <textarea
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    rows={4}
                    className="w-full min-h-[120px] resize-none rounded-2xl border border-white/60 bg-white/50 p-4 text-lg text-slate-900 outline-none backdrop-blur ring-sky-300/70 transition focus:ring-4"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Beskrivelse</span>
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    rows={7}
                    className="w-full min-h-[160px] resize-none rounded-2xl border border-white/60 bg-white/50 p-4 text-base text-slate-900 outline-none backdrop-blur ring-sky-300/70 transition focus:ring-4"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Gemmer..." : "Gem"}
              </button>

              <button
                type="button"
                onClick={() => void handleArchive()}
                disabled={isSaving}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 text-base font-semibold text-rose-600 transition active:scale-[0.99] disabled:opacity-60"
              >
                <Archive className="h-4 w-4" />
                Arkivér
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/70 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
