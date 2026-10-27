"use client";
import { useCallback, useEffect, useState } from 'react';
import { coarseDevice, FieldRecorder, type FieldReport, type ManualResult } from '@/lib/marine-navigation/field-diagnostics';

export function useFieldDiagnostics() {
  const [recorder] = useState(() => new FieldRecorder());
  const [active, setActive] = useState(false);
  const [report, setReport] = useState<FieldReport | null>(null);
  const start = useCallback(() => { recorder.start(); setReport(recorder.report()); setActive(true); }, [recorder]);
  const stop = useCallback(() => { recorder.stop(); setActive(false); setReport(recorder.report()); }, [recorder]);
  useEffect(() => {
    if (!active) return;
    let live = true;
    let permission: PermissionStatus | null = null;
    const permissionChanged = () => { if (live && permission) recorder.observe({permission: permission.state.toUpperCase()}); };
    // Query only; starting diagnostics never starts GPS or requests permission.
    void navigator.permissions?.query({name:'geolocation'}).then(value => {
      if (!live) return;
      permission = value; permissionChanged(); permission.addEventListener('change', permissionChanged);
    }).catch(() => { if (live) recorder.observe({permission:'UNKNOWN'}); });
    recorder.observe({...coarseDevice(navigator.userAgent), gpsSupported: navigator.geolocation ? 'SUPPORTED' : 'UNSUPPORTED', compassSupported: 'DeviceOrientationEvent' in window ? 'SUPPORTED' : 'UNSUPPORTED', wakeSupported: navigator.wakeLock ? 'SUPPORTED' : 'UNSUPPORTED', pwaDisplay: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone ? 'STANDALONE' : 'BROWSER'});
    const refresh = () => {
      recorder.observe({network: navigator.onLine ? 'ONLINE' : 'OFFLINE', visibility: document.visibilityState === 'visible' ? 'VISIBLE' : 'HIDDEN'});
      recorder.tick();
      setReport(recorder.report());
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('online',refresh); window.addEventListener('offline',refresh); document.addEventListener('visibilitychange',refresh);
    return () => {
      live = false; window.clearInterval(timer); permission?.removeEventListener('change',permissionChanged);
      window.removeEventListener('online',refresh); window.removeEventListener('offline',refresh); document.removeEventListener('visibilitychange',refresh);
    };
  }, [active,recorder]);
  useEffect(() => () => recorder.stop(), [recorder]);
  const setManual = useCallback((id: string, result: ManualResult) => { recorder.setManual(id,result); setReport(recorder.report()); }, [recorder]);
  return {recorder, active, report, start, stop, setManual, currentReport: () => recorder.report()};
}
export type FieldDiagnostics = ReturnType<typeof useFieldDiagnostics>;
