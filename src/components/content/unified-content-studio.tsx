"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clipboard,
  ImagePlus,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatGeneratedContent, sanitizeGeneratedText } from "@/lib/content-format";
import {
  readDailyUsage,
  readInstitution,
  saveDailyUsage,
  saveSavedItem,
  saveUnifiedRecord
} from "@/lib/local-store";
import { createClient } from "@/lib/supabase/client";
import { formatContentType, uid } from "@/lib/utils";
import type {
  ContentType,
  GeneratedContent,
  InstagramImageSelectionMode,
  Tone,
  UnifiedGenerationRecord,
  UnifiedGenerationResult,
  UploadedImage,
  UploadStatus
} from "@/types/content";

const contentTypes: ContentType[] = ["notice", "newsletter", "homepage", "blog", "instagram"];

const toneOptions: { value: Tone; label: string }[] = [
  { value: "warm", label: "따뜻한 감성형" },
  { value: "professional", label: "전문형" },
  { value: "simple", label: "간단형" },
  { value: "promotion", label: "홍보형" }
];

const ageGroups = ["만 2세", "만 3세", "만 4세", "만 5세", "혼합반"];

function deriveText(results: UnifiedGenerationResult, type: ContentType) {
  return formatGeneratedContent(type, results[type]);
}

function compressForSms(text: string) {
  return text.replace(/\n{2,}/g, "\n").slice(0, 900);
}

function isAdminUser() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem("kidsauto.demoUser");
  if (!raw) return false;
  try {
    const user = JSON.parse(raw) as { email?: string; role?: string };
    return user.role === "admin" || user.email === "admin@kidsauto.kr";
  } catch {
    return false;
  }
}

export function UnifiedContentStudio() {
  const today = new Date().toISOString().slice(0, 10);
  const [activityName, setActivityName] = useState("물놀이");
  const [keywordText, setKeywordText] = useState("물놀이, 여름, 친구들과 함께");
  const [className, setClassName] = useState("햇살반");
  const [ageGroup, setAgeGroup] = useState("만 4세");
  const [activityDate, setActivityDate] = useState(today);
  const [tone, setTone] = useState<Tone>("warm");
  const [analyzePhotos, setAnalyzePhotos] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedInstagramIds, setSelectedInstagramIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<InstagramImageSelectionMode>("auto_first_3");
  const [results, setResults] = useState<UnifiedGenerationResult | null>(null);
  const [editableTexts, setEditableTexts] = useState<Record<ContentType, string> | null>(null);
  const [editing, setEditing] = useState<ContentType | null>(null);
  const [noticeView, setNoticeView] = useState<"large" | "mobile" | "kakao" | "sms">("mobile");
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [statuses, setStatuses] = useState<Record<"homepage" | "blog" | "instagram", UploadStatus>>({
    homepage: "pending",
    blog: "pending",
    instagram: "pending"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const keywords = useMemo(
    () =>
      keywordText
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    [keywordText]
  );

  const selectedInstagramImages = useMemo(
    () => images.filter((image) => selectedInstagramIds.includes(image.id)),
    [images, selectedInstagramIds]
  );

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

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

      uploaded.push({ id: uid("image"), name: file.name, url: URL.createObjectURL(file) });
    }

    setImages((current) => {
      const next = [...current, ...uploaded];
      if (selectionMode === "auto_first_3") {
        setSelectedInstagramIds(next.slice(0, 3).map((image) => image.id));
      }
      return next;
    });
  }

  function changeSelectionMode(mode: InstagramImageSelectionMode) {
    setSelectionMode(mode);
    if (mode === "auto_first_3") {
      setSelectedInstagramIds(images.slice(0, 3).map((image) => image.id));
    }
    if (mode === "ai_recommended") {
      setSelectedInstagramIds(images.filter((_, index) => index % 2 === 0).slice(0, 5).map((image) => image.id));
    }
  }

  function makeRecord(nextResults: UnifiedGenerationResult, nextRegenerateCount = regenerateCount): UnifiedGenerationRecord {
    const now = new Date().toISOString();
    return {
      id: uid("generation"),
      uploadedImages: images,
      keywords,
      activityName,
      className,
      ageGroup,
      activityDate,
      tone,
      analyzePhotos,
      institution: readInstitution(),
      results: nextResults,
      noticeText: deriveText(nextResults, "notice"),
      newsletterText: deriveText(nextResults, "newsletter"),
      homepageText: deriveText(nextResults, "homepage"),
      blogText: deriveText(nextResults, "blog"),
      instagramText: deriveText(nextResults, "instagram"),
      uploadStatusHomepage: statuses.homepage,
      uploadStatusBlog: statuses.blog,
      uploadStatusInstagram: statuses.instagram,
      instagramSelectedImages: selectedInstagramImages,
      instagramImageSelectionMode: selectionMode,
      regenerateCount: nextRegenerateCount,
      createdAt: now,
      updatedAt: now
    };
  }

  async function persistRecord(record: UnifiedGenerationRecord) {
    saveUnifiedRecord(record);

    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      await supabase.from("generation_records").insert({
        user_id: data.user?.id,
        uploaded_images: record.uploadedImages,
        keywords: record.keywords,
        activity_name: record.activityName,
        class_name: record.className,
        age_group: record.ageGroup,
        activity_date: record.activityDate,
        tone: record.tone,
        analyze_photos: record.analyzePhotos,
        notice_text: record.noticeText,
        newsletter_text: record.newsletterText,
        homepage_text: record.homepageText,
        blog_text: record.blogText,
        instagram_text: record.instagramText,
        upload_status_homepage: record.uploadStatusHomepage,
        upload_status_blog: record.uploadStatusBlog,
        upload_status_instagram: record.uploadStatusInstagram,
        instagram_selected_images: record.instagramSelectedImages,
        instagram_image_selection_mode: record.instagramImageSelectionMode,
        regeneration_count: record.regenerateCount
      });
    }
  }

  async function generateAll() {
    const usage = readDailyUsage();
    if (!isAdminUser() && usage.generationCount >= 1) {
      setMessage("베타 버전은 사용자당 하루 1회 생성만 가능합니다. 관리자 계정은 제한 없이 생성할 수 있습니다.");
      return;
    }

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadedImages: images,
        keywords,
        activityName,
        className,
        ageGroup,
        activityDate,
        tone,
        analyzePhotos,
        institution: readInstitution()
      })
    });

    const data = (await response.json()) as { results: UnifiedGenerationResult };
    setResults(data.results);
    setEditableTexts(Object.fromEntries(contentTypes.map((type) => [type, deriveText(data.results, type)])) as Record<ContentType, string>);
    await persistRecord(makeRecord(data.results, 0));
    saveDailyUsage({ ...usage, generationCount: usage.generationCount + 1 });
    setRegenerateCount(0);
    setLoading(false);
    setMessage("5종 콘텐츠가 한 번에 생성되었습니다.");
  }

  async function regenerate(type: ContentType) {
    if (!results || (!isAdminUser() && regenerateCount >= 2)) {
      setMessage("재생성은 최대 2회까지 가능합니다. 수정하기로 문장을 다듬어 주세요.");
      return;
    }

    const usage = readDailyUsage();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        keywords,
        images: analyzePhotos ? images : [],
        activityName,
        className,
        ageGroup,
        activityDate,
        tone,
        analyzePhotos,
        institution: readInstitution()
      })
    });
    const data = (await response.json()) as { content: GeneratedContent };
    const nextResults = { ...results, [type]: data.content };
    const nextCount = regenerateCount + 1;
    setResults(nextResults);
    setEditableTexts((current) => ({ ...(current ?? {}), [type]: formatGeneratedContent(type, data.content) } as Record<ContentType, string>));
    setRegenerateCount(nextCount);
    saveDailyUsage({ ...usage, regenerationCount: usage.regenerationCount + 1 });
    await persistRecord(makeRecord(nextResults, nextCount));
    setMessage(`재생성 ${nextCount}/2회 사용했습니다.`);
  }

  async function copy(type: ContentType) {
    const text = editableTexts?.[type] ?? "";
    await navigator.clipboard.writeText(type === "notice" && noticeView === "sms" ? compressForSms(text) : text);
    setMessage(`${formatContentType(type)} 내용을 복사했습니다.`);
  }

  function saveEdit(type: ContentType) {
    const content = editableTexts?.[type] ? sanitizeGeneratedText(editableTexts[type]) : "";
    saveSavedItem({
      id: uid("saved"),
      title: results?.[type]?.title ?? `${formatContentType(type)} 저장본`,
      contentType: type,
      content,
      createdAt: new Date().toISOString(),
      inputData: {
        activityName,
        keywords,
        className,
        ageGroup,
        activityDate,
        tone,
        analyzePhotos,
        uploadedImages: images
      }
    });

    if (results && editableTexts) {
      const editedResults = { ...results };
      editedResults[type] = {
        ...editedResults[type],
        body: content,
        sections: []
      };
      void persistRecord(makeRecord(editedResults, regenerateCount));
    }
    setEditing(null);
    setMessage(`${formatContentType(type)} 내용을 저장했습니다.`);
  }

  function applyQuickEdit(type: ContentType, mode: "warm" | "short" | "thanks") {
    setEditing(type);
    setEditableTexts((current) => {
      const base = current?.[type] ?? "";
      const next =
        mode === "short"
          ? base.split("\n").filter(Boolean).slice(0, 5).join("\n")
          : mode === "thanks"
            ? `${base}\n\n가정에서도 늘 따뜻하게 함께해 주셔서 감사합니다.`
            : `${base}\n\n아이들의 작은 표정과 마음을 더 따뜻하게 담아 전합니다.`;

      return { ...(current ?? {}), [type]: next } as Record<ContentType, string>;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge>사진 1회 · 입력 1회 · 생성 1회</Badge>
          <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">통합 콘텐츠 생성</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            같은 활동 정보를 한 번만 입력하면 알림장, 가정통신문, 홈페이지, 블로그, 인스타그램 콘텐츠를 동시에 생성합니다.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-muted">
          재생성 {regenerateCount}/2
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5 rounded-md border border-line bg-white p-5 shadow-soft">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">사진 업로드</span>
            <span className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface px-4 text-center hover:border-brand-500 hover:bg-brand-50">
              <UploadCloud className="text-brand-600" />
              <span className="mt-2 text-sm font-semibold">jpg, png, webp 여러 장 첨부</span>
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
            </span>
          </label>

          {images.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">인스타용 사진 선택</p>
                <p className="text-xs font-semibold text-muted">{selectedInstagramIds.length}장 선택</p>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {[
                  ["auto_first_3", "첫 3장"],
                  ["manual", "직접"],
                  ["ai_recommended", "AI 추천"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`h-9 rounded-md border text-xs font-bold ${selectionMode === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-muted"}`}
                    onClick={() => changeSelectionMode(value as InstagramImageSelectionMode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((image) => {
                  const selected = selectedInstagramIds.includes(image.id);
                  return (
                    <button
                      key={image.id}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-md border border-line bg-surface"
                      onClick={() => {
                        if (selectionMode !== "manual") setSelectionMode("manual");
                        setSelectedInstagramIds((current) =>
                          selected ? current.filter((id) => id !== image.id) : [...current, image.id]
                        );
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                      <span className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md ${selected ? "bg-brand-600 text-white" : "bg-white text-muted"}`}>
                        <Check size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label>
              <span className="mb-2 block text-sm font-bold">활동명</span>
              <Input value={activityName} onChange={(event) => setActivityName(event.target.value)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">활동 키워드</span>
              <Input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">반 이름</span>
              <Input value={className} onChange={(event) => setClassName(event.target.value)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">연령</span>
              <select className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm" value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
                {ageGroups.map((age) => <option key={age}>{age}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarDays size={16} />날짜</span>
              <Input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">문체</span>
              <select className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
                {toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-3 text-sm font-semibold">
            <input className="mt-1" type="checkbox" checked={analyzePhotos} onChange={(event) => setAnalyzePhotos(event.target.checked)} />
            <span>
              사진 내용도 AI 분석하기
              <span className="mt-1 block text-xs font-medium text-muted">기본 OFF. 비용 절감을 위해 사진 분석은 선택 시에만 사용합니다.</span>
            </span>
          </label>

          {message && <p className="rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p>}

          <Button className="h-12 w-full" onClick={generateAll} disabled={loading || !activityName}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            5종 콘텐츠 동시 생성
          </Button>
        </div>

        <div className="space-y-4">
          {!results ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-md border border-line bg-white p-6 text-center text-muted shadow-soft">
              <ImagePlus size={38} />
              <p className="mt-3 text-sm font-semibold">왼쪽 입력만 완료하면 5종 결과가 카드로 표시됩니다.</p>
            </div>
          ) : (
            contentTypes.map((type) => (
              <ResultCard
                key={type}
                type={type}
                text={editableTexts?.[type] ?? ""}
                editing={editing === type}
                noticeView={noticeView}
                statuses={statuses}
                onNoticeView={setNoticeView}
                onChange={(value) => setEditableTexts((current) => ({ ...(current ?? {}), [type]: value } as Record<ContentType, string>))}
                onCopy={() => copy(type)}
                onSave={() => saveEdit(type)}
                onEdit={() => setEditing(type)}
                onRegenerate={() => regenerate(type)}
                onQuickEdit={(mode) => applyQuickEdit(type, mode)}
                onStatus={(key, value) => setStatuses((current) => ({ ...current, [key]: value }))}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

type ResultCardProps = {
  type: ContentType;
  text: string;
  editing: boolean;
  noticeView: "large" | "mobile" | "kakao" | "sms";
  statuses: Record<"homepage" | "blog" | "instagram", UploadStatus>;
  onNoticeView: (value: "large" | "mobile" | "kakao" | "sms") => void;
  onChange: (value: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onQuickEdit: (mode: "warm" | "short" | "thanks") => void;
  onStatus: (key: "homepage" | "blog" | "instagram", value: UploadStatus) => void;
};

function ResultCard(props: ResultCardProps) {
  const isNotice = props.type === "notice";
  const uploadKey = props.type === "homepage" || props.type === "blog" || props.type === "instagram" ? props.type : null;
  const displayText = isNotice && props.noticeView === "sms" ? compressForSms(props.text) : props.text;

  return (
    <article className="rounded-md border border-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-ink">{formatContentType(props.type)}</h2>
          {uploadKey && (
            <p className="mt-1 text-xs font-semibold text-muted">업로드 예약 상태: {props.statuses[uploadKey]}</p>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:flex">
          <Button variant="secondary" className="px-3" onClick={props.onCopy}><Clipboard size={15} />복사</Button>
          <Button variant="secondary" className="px-3" onClick={props.editing ? props.onSave : props.onEdit}>{props.editing ? <Save size={15} /> : <MessageSquareText size={15} />}{props.editing ? "저장" : "수정"}</Button>
          <Button variant="secondary" className="px-3" onClick={props.onRegenerate}><RefreshCw size={15} />재생성</Button>
          <Button variant="secondary" className="px-3" onClick={props.onSave}><Save size={15} />저장</Button>
        </div>
      </div>

      {isNotice && (
        <div className="grid grid-cols-4 gap-2 border-b border-line p-3">
          {[
            ["large", "큰 글씨"],
            ["mobile", "모바일"],
            ["kakao", "카카오톡"],
            ["sms", "문자용"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`h-9 rounded-md border text-xs font-bold ${props.noticeView === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-muted"}`}
              onClick={() => props.onNoticeView(value as "large" | "mobile" | "kakao" | "sms")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-line p-3">
        <button type="button" className="h-8 rounded-md border border-line px-3 text-xs font-bold text-muted" onClick={() => props.onQuickEdit("warm")}>
          더 따뜻하게
        </button>
        <button type="button" className="h-8 rounded-md border border-line px-3 text-xs font-bold text-muted" onClick={() => props.onQuickEdit("short")}>
          더 짧게
        </button>
        <button type="button" className="h-8 rounded-md border border-line px-3 text-xs font-bold text-muted" onClick={() => props.onQuickEdit("thanks")}>
          부모 감사문 추가
        </button>
      </div>

      {uploadKey && (
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          {(["pending", "completed", "failed"] as UploadStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={`h-8 rounded-md border px-3 text-xs font-bold ${props.statuses[uploadKey] === status ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-muted"}`}
              onClick={() => props.onStatus(uploadKey, status)}
            >
              <Send className="mr-1 inline" size={13} />
              {status === "pending" ? "대기" : status === "completed" ? "완료" : "실패"}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        {props.editing ? (
          <Textarea className="min-h-72" value={props.text} onChange={(event) => props.onChange(event.target.value)} />
        ) : (
          <pre className={`whitespace-pre-wrap rounded-md bg-surface p-4 font-sans leading-7 text-ink ${isNotice && props.noticeView === "large" ? "text-lg" : "text-sm"}`}>
            {displayText}
          </pre>
        )}
      </div>
    </article>
  );
}
