"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Copy, ImagePlus, Loader2, Save, Sparkles, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { readInstitution, saveHistory } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/client";
import { cn, formatContentType, uid } from "@/lib/utils";
import type { ContentHistoryItem, ContentType, GeneratedContent, UploadedImage } from "@/types/content";

type ContentStudioProps = {
  type: ContentType;
  description: string;
  placeholders: string[];
};

export function ContentStudio({ type, description, placeholders }: ContentStudioProps) {
  const [keywordText, setKeywordText] = useState(placeholders.slice(0, 2).join(", "));
  const [memo, setMemo] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const keywords = useMemo(
    () =>
      keywordText
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    [keywordText]
  );

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setMessage("");

    const supabase = createClient();
    const uploaded: UploadedImage[] = [];

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMessage("jpg, png, webp 파일만 업로드할 수 있습니다.");
        continue;
      }

      if (supabase) {
        const path = `content/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("content-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false
        });

        if (!error) {
          const { data } = supabase.storage.from("content-images").getPublicUrl(path);
          uploaded.push({ id: uid("image"), name: file.name, url: data.publicUrl, path });
          continue;
        }
      }

      uploaded.push({
        id: uid("image"),
        name: file.name,
        url: URL.createObjectURL(file)
      });
    }

    setImages((current) => [...current, ...uploaded]);
    setIsUploading(false);
  }

  async function generate() {
    setIsGenerating(true);
    setMessage("");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        keywords,
        memo,
        images,
        institution: readInstitution()
      })
    });

    const data = (await response.json()) as { content: GeneratedContent };
    setContent(data.content);

    const item: ContentHistoryItem = {
      id: uid("history"),
      type,
      keywords,
      content: data.content,
      imageUrls: images.map((image) => image.url),
      createdAt: new Date().toISOString()
    };

    saveHistory(item);

    const supabase = createClient();
    if (supabase) {
      await supabase.from("generated_contents").insert({
        content_type: type,
        keywords,
        title: data.content.title,
        body: data.content.body,
        sections: data.content.sections,
        hashtags: data.content.hashtags ?? [],
        image_urls: images.map((image) => image.url)
      });
    }

    setIsGenerating(false);
    setMessage("생성 결과가 저장되었습니다.");
  }

  async function copyResult() {
    if (!content) return;
    const text = [
      content.title,
      content.body,
      ...content.sections.map((section) => `${section.label}\n${section.value}`),
      content.hashtags?.map((tag) => `#${tag}`).join(" ")
    ]
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    setMessage("생성 결과를 복사했습니다.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge>{formatContentType(type)}</Badge>
        <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">{formatContentType(type)} 생성</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,440px)_1fr]">
        <section className="space-y-5 rounded-md border border-line bg-white p-5 shadow-soft">
          <div>
            <label className="text-sm font-bold text-ink">사진 업로드</label>
            <label className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface px-4 text-center transition hover:border-brand-500 hover:bg-brand-50">
              {isUploading ? <Loader2 className="animate-spin text-brand-600" /> : <UploadCloud className="text-brand-600" />}
              <span className="mt-3 text-sm font-semibold">jpg, png, webp 여러 장 업로드</span>
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
            </label>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((image) => (
                <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 hidden h-7 w-7 items-center justify-center rounded-md bg-white text-ink shadow group-hover:flex"
                    onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                    aria-label="이미지 제거"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-ink">키워드</label>
            <Input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} placeholder={placeholders.join(", ")} />
            <p className="mt-2 text-xs text-muted">쉼표로 구분해 입력합니다.</p>
          </div>

          <div>
            <label className="text-sm font-bold text-ink">교사용 메모</label>
            <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="반 이름, 아이들 반응, 행사 일정 등 추가 맥락을 입력하세요." />
          </div>

          <Button className="w-full" onClick={generate} disabled={isGenerating || keywords.length === 0}>
            {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
            AI 콘텐츠 생성
          </Button>
        </section>

        <section className="min-h-[560px] rounded-md border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-black">생성 결과</h2>
              {message && <p className="mt-1 text-xs font-semibold text-brand-700">{message}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyResult} disabled={!content} aria-label="복사">
                <Copy size={16} />
                복사
              </Button>
              <Button variant="secondary" disabled={!content} aria-label="저장됨">
                <Save size={16} />
                저장됨
              </Button>
            </div>
          </div>

          {!content ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center px-5 text-center text-muted">
              <ImagePlus size={36} />
              <p className="mt-3 text-sm font-semibold">사진과 키워드를 입력하면 결과가 여기에 표시됩니다.</p>
            </div>
          ) : (
            <article className="space-y-5 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Title</p>
                <h3 className="mt-2 text-xl font-black text-ink">{content.title}</h3>
              </div>
              <p className="rounded-md bg-surface p-4 text-sm leading-7 text-ink">{content.body}</p>
              <div className="space-y-3">
                {content.sections.map((section) => (
                  <div key={section.label} className="rounded-md border border-line p-4">
                    <p className="text-sm font-black text-ink">{section.label}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted">{section.value}</p>
                  </div>
                ))}
              </div>
              {content.hashtags && (
                <div className="flex flex-wrap gap-2">
                  {content.hashtags.map((tag) => (
                    <span key={tag} className={cn("rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-ink")}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
