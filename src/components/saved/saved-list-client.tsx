"use client";

import { useEffect, useState } from "react";
import { Clipboard, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSavedItem, readSavedItems } from "@/lib/local-store";
import { formatContentType } from "@/lib/utils";
import type { SavedContentItem } from "@/types/content";

export function SavedListClient() {
  const [items, setItems] = useState<SavedContentItem[]>([]);
  const [selected, setSelected] = useState<SavedContentItem | null>(null);
  const [message, setMessage] = useState("");

  function refresh() {
    const nextItems = readSavedItems();
    setItems(nextItems);
    setSelected((current) => current ?? nextItems[0] ?? null);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function copy(item: SavedContentItem) {
    await navigator.clipboard.writeText(item.content);
    setMessage("저장된 내용을 복사했습니다.");
  }

  function remove(id: string) {
    deleteSavedItem(id);
    const nextItems = readSavedItems();
    setItems(nextItems);
    setSelected(nextItems[0] ?? null);
    setMessage("삭제했습니다.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge>사용자별 localStorage 임시 저장</Badge>
        <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">저장 목록</h1>
        <p className="mt-2 text-sm text-muted">저장한 생성 결과를 다시 불러오고, 복사하거나 삭제합니다.</p>
        {message && <p className="mt-2 text-sm font-semibold text-brand-700">{message}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-md border border-line bg-white shadow-soft">
          <div className="border-b border-line px-4 py-3 text-sm font-black">저장된 결과</div>
          <div className="divide-y divide-line">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">저장된 결과가 없습니다.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`block w-full px-4 py-3 text-left hover:bg-surface ${selected?.id === item.id ? "bg-brand-50" : ""}`}
                  onClick={() => {
                    setSelected(item);
                    setMessage("저장된 결과를 불러왔습니다.");
                  }}
                >
                  <p className="truncate text-sm font-bold text-ink">{item.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
                    <span>{formatContentType(item.contentType)} · {new Date(item.createdAt).toLocaleString("ko-KR")}</span>
                    <span className="text-brand-700">불러오기</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="min-h-[520px] rounded-md border border-line bg-white shadow-soft">
          {!selected ? (
            <div className="flex min-h-[520px] items-center justify-center text-sm text-muted">불러올 항목을 선택하세요.</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-ink">{selected.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-muted">{formatContentType(selected.contentType)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => copy(selected)}>
                    <Clipboard size={15} />
                    복사
                  </Button>
                  <Button variant="secondary" onClick={() => remove(selected.id)}>
                    <Trash2 size={15} />
                    삭제
                  </Button>
                </div>
              </div>
              <pre className="m-4 whitespace-pre-wrap rounded-md bg-surface p-4 font-sans text-sm leading-7 text-ink">
                {selected.content}
              </pre>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
