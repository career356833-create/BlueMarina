"use client";

import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultInstitution, readInstitution, saveInstitution } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/client";
import type { Institution } from "@/types/content";

export function SettingsClient() {
  const [institution, setInstitution] = useState<Institution>(defaultInstitution);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstitution(readInstitution());
  }, []);

  function update<K extends keyof Institution>(key: K, value: Institution[K]) {
    setInstitution((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    saveInstitution(institution);

    const supabase = createClient();
    if (supabase) {
      await supabase.from("institutions").upsert({
        id: institution.id,
        name: institution.name,
        institution_type: institution.type,
        logo_url: institution.logoUrl,
        address: institution.address,
        phone: institution.phone
      });
    }

    setMessage("기관 정보가 저장되었습니다.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge>기관 관리</Badge>
        <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">설정</h1>
        <p className="mt-2 text-sm text-muted">어린이집/유치원 기본 정보를 등록하고 콘텐츠 생성에 반영합니다.</p>
      </div>

      <section className="max-w-3xl rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="font-black">기관 정보</h2>
            {message && <p className="mt-1 text-sm font-semibold text-brand-700">{message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold">기관명</span>
            <Input value={institution.name} onChange={(event) => update("name", event.target.value)} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">기관 유형</span>
            <select
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              value={institution.type}
              onChange={(event) => update("type", event.target.value as Institution["type"])}
            >
              <option value="daycare">어린이집</option>
              <option value="kindergarten">유치원</option>
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">로고 URL</span>
            <Input value={institution.logoUrl ?? ""} onChange={(event) => update("logoUrl", event.target.value)} />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">주소</span>
            <Input value={institution.address} onChange={(event) => update("address", event.target.value)} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">연락처</span>
            <Input value={institution.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
        </div>

        <div className="mt-6">
          <Button onClick={save}>
            <Save size={17} />
            저장
          </Button>
        </div>
      </section>
    </div>
  );
}
