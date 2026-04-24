"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import type { Label } from "@/types/planka";

interface LabelBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLabel: (labelId: string) => void;
  labels?: Label[];
}

const DUMMY_LABELS: Label[] = [
  { id: "urgent", name: "Urgent", color: "#ef4444" },
  { id: "today", name: "I dag", color: "#f59e0b" },
  { id: "next", name: "Næste", color: "#3b82f6" },
  { id: "done", name: "Færdig", color: "#10b981" },
];

export function LabelBottomSheet({
  isOpen,
  onClose,
  onSelectLabel,
  labels = DUMMY_LABELS,
}: LabelBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="label-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        >
          <motion.div
            key="label-sheet"
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-white/60 bg-white/90 px-5 pb-8 pt-4 shadow-2xl backdrop-blur-xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Vælg label"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="h-1.5 w-16 rounded-full bg-slate-300/80" />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-slate-700"
                aria-label="Luk"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mb-4 text-xl font-semibold text-slate-900">Vælg label</h2>

            <div className="grid grid-cols-1 gap-3">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onSelectLabel(label.id)}
                  className="flex min-h-14 items-center justify-between rounded-2xl border border-white/50 px-4 py-3 text-left text-base font-semibold text-slate-900 shadow-sm transition active:scale-[0.99]"
                  style={{
                    backgroundColor: `${label.color}33`,
                  }}
                >
                  <span>{label.name || "Uden navn"}</span>
                  <span
                    className="h-4 w-4 rounded-full border border-white/70"
                    style={{ backgroundColor: label.color }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
