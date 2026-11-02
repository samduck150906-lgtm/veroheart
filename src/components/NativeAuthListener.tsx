import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { readAuthCallback, toNativeCallbackUrl } from '../lib/nativeAuth';

/** Mount once under BrowserRouter; handles both a running app and a cold launch. */
export default function NativeAuthListener() {
  const navigate = useNavigate();
  // useNavigate can change after navigation. Keep consumed launch URLs across
  // effect re-subscription so getLaunchUrl cannot send a signed-in user back.
  const consumed = useRef(new Set<string>());
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const seen = consumed.current;
    const receive = (raw: string) => {
      if (disposed || seen.has(raw) || !readAuthCallback(raw)) return;
      const callback = toNativeCallbackUrl(raw);
      if (!callback) return;
      seen.add(raw);
      void Browser.close().catch(() => { /* Android browser closes itself on return. */ });
      navigate(`/auth/callback${new URL(callback).search}`, { replace: true });
    };
    const listener = App.addListener('appUrlOpen', ({ url }) => receive(url));
    void App.getLaunchUrl().then((launch) => { if (launch?.url) receive(launch.url); }).catch(() => {});
    return () => {
      disposed = true;
      void listener.then((handle) => handle.remove()).catch(() => {});
    };
  }, [navigate]);
  return null;
}
