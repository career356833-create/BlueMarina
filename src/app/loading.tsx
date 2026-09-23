export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#050F19] px-5 text-white" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-pulse rounded-full border border-[#79C9D6]/50 bg-[#79C9D6]/10" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-[#B8CBDD]">Blue Marina 정보를 불러오는 중입니다</p>
      </div>
    </main>
  );
}
