import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Board } from "@/types/planka";

interface BoardCardProps {
  board: Board;
  index: number;
}

const TINTS = [
  "from-rose-100/90 to-pink-100/70",
  "from-sky-100/90 to-blue-100/70",
  "from-emerald-100/90 to-teal-100/70",
  "from-violet-100/90 to-indigo-100/70",
  "from-amber-100/90 to-orange-100/70",
];

export function BoardCard({ board, index }: BoardCardProps) {
  const tint = TINTS[index % TINTS.length];

  return (
    <Link
      href={`/boards/${board.id}`}
      className={`group block rounded-3xl border border-white/70 bg-gradient-to-br ${tint} p-5 shadow-md backdrop-blur-sm transition active:scale-[0.99]`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-900">
          {board.name}
        </h2>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
