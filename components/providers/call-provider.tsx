'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useWebRTC } from '@/hooks/use-webrtc';
import { CallOverlay } from '@/components/call/call-overlay';
import { toast } from 'sonner';
import { startIncomingRing, startOutgoingRing, stopAllRings } from '@/lib/ringtone';
import type { SocialCallSession, Profile } from '@/lib/types';

interface CallContextValue {
  startCall: (remoteUser: Profile, callType: 'audio' | 'video') => Promise<void>;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextValue>({
  startCall: async () => {},
  endCall: () => {},
  toggleMic: () => {},
  toggleCamera: () => {},
});

export function CallProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const webrtc = useWebRTC();
  const esRef = useRef<EventSource | null>(null);
  const [incomingCall, setIncomingCall] = useState<SocialCallSession | null>(null);
  const [callerProfile, setCallerProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const res = await fetch(`/api/data?model=profiles&where=${encodeURIComponent(JSON.stringify({ id: userId }))}`);
      const json = await res.json();
      return json?.data?.[0] || null;
    } catch {
      return null;
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/images/1.png', tag: 'incoming-call' });
      } catch {}
    }
  }, []);

  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>('');

  const startTitleFlash = useCallback((callerName: string) => {
    if (typeof document === 'undefined') return;
    if (!originalTitleRef.current) originalTitleRef.current = document.title;
    if (titleFlashRef.current) clearInterval(titleFlashRef.current);
    let toggle = false;
    titleFlashRef.current = setInterval(() => {
      document.title = toggle ? `📞 ${callerName} در حال تماس...` : originalTitleRef.current;
      toggle = !toggle;
    }, 1000);
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    if (originalTitleRef.current && typeof document !== 'undefined') {
      document.title = originalTitleRef.current;
    }
  }, []);

  const handleStartCall = useCallback(async (remoteUser: Profile, callType: 'audio' | 'video') => {
    if (!profile) {
      toast.error('کاربر احراز هویت نشده');
      return;
    }
    try {
      const res = await fetch('/api/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: remoteUser.id, callType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'خطا در برقراری تماس');
        return;
      }
      const session: SocialCallSession = data.session;
      startOutgoingRing();
      await webrtc.startCall(session.id, remoteUser.id, callType);
    } catch (e: any) {
      toast.error('خطا در برقراری تماس: ' + (e?.message || e));
    }
  }, [profile, webrtc]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    try {
      const res = await fetch('/api/call/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: incomingCall.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'پاسخ به تماس ناموفق بود');
        return;
      }
      stopAllRings();
      stopTitleFlash();
      const offerSdp = incomingCall.offerSdp;
      if (offerSdp) {
        await webrtc.acceptCall(incomingCall.id, incomingCall.callerId, incomingCall.callType as 'audio' | 'video', offerSdp);
      } else {
        toast.error('اطلاعات تماس ناقص است');
      }
      setIncomingCall(null);
    } catch (e: any) {
      toast.error('پاسخ به تماس ناموفق بود: ' + (e?.message || e));
    }
  }, [incomingCall, profile, webrtc]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;
    stopAllRings();
    stopTitleFlash();
    await webrtc.rejectCall(incomingCall.id);
    setIncomingCall(null);
    setCallerProfile(null);
  }, [incomingCall, webrtc]);

  const handleEndCall = useCallback(() => {
    stopAllRings();
    stopTitleFlash();
    webrtc.endCall();
  }, [webrtc]);

  useEffect(() => {
    if (webrtc.state.error) {
      toast.error(webrtc.state.error);
    }
  }, [webrtc.state.error]);

  useEffect(() => {
    if (webrtc.state.status === 'calling' || webrtc.state.status === 'ringing') {
      startOutgoingRing();
    } else if (webrtc.state.status !== 'accepted' && webrtc.state.status !== 'idle') {
      stopAllRings();
    }
  }, [webrtc.state.status]);

  useEffect(() => {
    if (!profile) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const es = new EventSource('/api/call/stream');
    esRef.current = es;

    es.addEventListener('incoming_call', async (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        if (call.receiverId === profile.id && (call.status === 'calling' || call.status === 'ringing')) {
          setIncomingCall(call);
          const cp = await fetchProfile(call.callerId);
          setCallerProfile(cp);
          startIncomingRing();
          const callerName = cp ? [cp.firstName, cp.lastName].filter(Boolean).join(' ') : 'کاربر';
          if (document.hidden) {
            showBrowserNotification('تماس ورودی', `${callerName} در حال تماس با شماست`);
          }
          startTitleFlash(callerName);
        }
      } catch (err) {
        console.error('[CALL] SSE incoming_call error', err);
      }
    });

    es.addEventListener('call_update', (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        if (call.callerId === profile.id) {
          if (call.status === 'rejected') {
            stopAllRings();
            stopTitleFlash();
            toast.info('تماس رد شد');
            webrtc.endCall('rejected');
          } else if (call.status === 'ended') {
            stopAllRings();
            stopTitleFlash();
            webrtc.endCall('ended');
          } else if (call.status === 'missed') {
            stopAllRings();
            stopTitleFlash();
            toast.info('تماس پاسخ داده نشد');
            webrtc.endCall('missed');
          } else if (call.status === 'accepted') {
            stopAllRings();
          }
        }
      } catch (err) {
        console.error('[CALL] SSE call_update error', err);
      }
    });

    es.addEventListener('call_signal', (e) => {
      try {
        const sig = JSON.parse(e.data);
        if (sig.signalType === 'end') {
          stopAllRings();
          stopTitleFlash();
          webrtc.endCall('remote_ended');
        } else if (sig.signalType === 'reject') {
          stopAllRings();
          stopTitleFlash();
          webrtc.endCall('rejected');
        } else {
          webrtc.handleSignal(sig.signalType, sig.signalData);
        }
      } catch (err) {
        console.error('[CALL] SSE call_signal error', err);
      }
    });

    es.addEventListener('error', (e: any) => {
      console.error('[CALL] SSE stream error', e?.message || e);
    });

    return () => {
      es.close();
      esRef.current = null;
      stopAllRings();
      stopTitleFlash();
    };
  }, [profile, webrtc, fetchProfile, showBrowserNotification, startTitleFlash, stopTitleFlash]);

  return (
    <CallContext.Provider value={{ startCall: handleStartCall, endCall: handleEndCall, toggleMic: webrtc.toggleMic, toggleCamera: webrtc.toggleCamera }}>
      {children}
      {(incomingCall || webrtc.state.status !== 'idle') && (
        <CallOverlay
          webrtc={webrtc}
          incomingCall={incomingCall}
          callerProfile={callerProfile}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEnd={handleEndCall}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
