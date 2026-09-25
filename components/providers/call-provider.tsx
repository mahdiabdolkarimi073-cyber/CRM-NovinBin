'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useWebRTC } from '@/hooks/use-webrtc';
import { CallOverlay } from '@/components/call/call-overlay';
import { toast } from 'sonner';
import { startIncomingRing, startOutgoingRing, stopAllRings } from '@/lib/ringtone';
import type { SocialCallSession, Profile } from '@/lib/types';

type CallScope = 'social' | 'customer';

interface CallContextValue {
  startCall: (remoteUser: Profile, callType: 'audio' | 'video', scope?: CallScope) => Promise<void>;
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

export function CallProvider({ children, modes = ['social'] }: { children: ReactNode; modes?: CallScope[] }) {
  const { profile } = useAuth();
  const [activeScope, setActiveScope] = useState<CallScope>('social');
  const activeScopeRef = useRef<CallScope>('social');
  activeScopeRef.current = activeScope;
  const apiPrefixRef = useRef<string>('/api/call');
  apiPrefixRef.current = activeScope === 'customer' ? '/api/customer-call' : '/api/call';
  const webrtc = useWebRTC(apiPrefixRef);
  const esRef = useRef<EventSource | null>(null);
  const customerEsRef = useRef<EventSource | null>(null);
  const [incomingCall, setIncomingCall] = useState<SocialCallSession | null>(null);
  const [callerProfile, setCallerProfile] = useState<Profile | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingCallRef = useRef<SocialCallSession | null>(null);
  incomingCallRef.current = incomingCall;
  const webrtcStatusRef = useRef<string>('idle');
  webrtcStatusRef.current = webrtc.state.status;
  const webrtcEndCallRef = useRef(webrtc.endCall);
  webrtcEndCallRef.current = webrtc.endCall;
  const webrtcHandleSignalRef = useRef(webrtc.handleSignal);
  webrtcHandleSignalRef.current = webrtc.handleSignal;

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

  const handleStartCall = useCallback(async (remoteUser: Profile, callType: 'audio' | 'video', scope: CallScope = 'social') => {
    if (!profile) {
      toast.error('کاربر احراز هویت نشده');
      return;
    }
    setActiveScope(scope);
    activeScopeRef.current = scope;
    apiPrefixRef.current = scope === 'customer' ? '/api/customer-call' : '/api/call';
    const apiBase = apiPrefixRef.current;
    try {
      const res = await fetch(`${apiBase}/initiate`, {
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
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        if (webrtc.state.status === 'calling' || webrtc.state.status === 'ringing') {
          stopAllRings();
          stopTitleFlash();
          webrtc.endCall('timeout');
          toast.info('تماس پاسخ داده نشد');
        }
      }, 45000);
      await webrtc.startCall(session.id, remoteUser.id, callType);
    } catch (e: any) {
      toast.error('خطا در برقراری تماس: ' + (e?.message || e));
    }
  }, [profile, webrtc]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    const apiBase = activeScopeRef.current === 'customer' ? '/api/customer-call' : '/api/call';
    apiPrefixRef.current = apiBase;
    try {
      const res = await fetch(`${apiBase}/accept`, {
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
      const freshSession: SocialCallSession = data.session;
      const offerSdp = freshSession.offerSdp || incomingCall.offerSdp;
      if (offerSdp) {
        await webrtc.acceptCall(incomingCall.id, incomingCall.callerId, incomingCall.callType as 'audio' | 'video', offerSdp);
      } else {
        toast.error('اطلاعات تماس ناقص است — لطفاً دوباره تلاش کنید');
      }
      setIncomingCall(null);
    } catch (e: any) {
      toast.error('پاسخ به تماس ناموفق بود: ' + (e?.message || e));
    }
  }, [incomingCall, profile, webrtc]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;
    apiPrefixRef.current = activeScopeRef.current === 'customer' ? '/api/customer-call' : '/api/call';
    stopAllRings();
    stopTitleFlash();
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    await webrtc.rejectCall(incomingCall.id);
    setIncomingCall(null);
    setCallerProfile(null);
  }, [incomingCall, webrtc]);

  const handleEndCall = useCallback(() => {
    stopAllRings();
    stopTitleFlash();
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    webrtc.endCall();
  }, [webrtc]);

  useEffect(() => {
    if (webrtc.state.error) {
      toast.error(webrtc.state.error);
    }
  }, [webrtc.state.error]);

  useEffect(() => {
    if (incomingCall) {
      startIncomingRing();
      return;
    }
    if (webrtc.state.status === 'calling' || webrtc.state.status === 'ringing') {
      startOutgoingRing();
    } else {
      stopAllRings();
    }
  }, [webrtc.state.status, incomingCall]);

  // Shared SSE event handler factory
  const createSSEHandlers = useCallback((scope: CallScope) => {
    const handleIncoming = async (e: MessageEvent) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        console.log(`[CALL:${scope}] SSE incoming_call received`, { sessionId: call.id, status: call.status, callerId: call.callerId, receiverId: call.receiverId, hasOffer: !!call.offerSdp });
        if (call.receiverId === profile?.id && (call.status === 'calling' || call.status === 'ringing')) {
          // Don't override if already in a call
          if (incomingCallRef.current || webrtcStatusRef.current !== 'idle') {
            console.log(`[CALL:${scope}] incoming_call ignored — already in a call`, { webrtcStatus: webrtcStatusRef.current, hasIncoming: !!incomingCallRef.current });
            return;
          }
          console.log(`[CALL:${scope}] showing incoming call UI`, { sessionId: call.id, callerId: call.callerId });
          setActiveScope(scope);
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
        console.error(`[CALL:${scope}] SSE incoming_call error`, err);
      }
    };

    const handleUpdate = (e: MessageEvent) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        console.log(`[CALL:${scope}] SSE call_update received`, { sessionId: call.id, status: call.status, callerId: call.callerId });
        if (call.callerId === profile?.id) {
          if (call.status === 'rejected') {
            console.log(`[CALL:${scope}] call rejected by remote`, { sessionId: call.id });
            stopAllRings(); stopTitleFlash();
            toast.info('تماس رد شد');
            webrtcEndCallRef.current('rejected');
          } else if (call.status === 'ended') {
            console.log(`[CALL:${scope}] call ended by remote`, { sessionId: call.id });
            stopAllRings(); stopTitleFlash();
            webrtcEndCallRef.current('ended');
          } else if (call.status === 'missed') {
            console.log(`[CALL:${scope}] call missed`, { sessionId: call.id });
            stopAllRings(); stopTitleFlash();
            toast.info('تماس پاسخ داده نشد');
            webrtcEndCallRef.current('missed');
          } else if (call.status === 'accepted') {
            console.log(`[CALL:${scope}] call accepted by remote`, { sessionId: call.id });
            stopAllRings(); stopTitleFlash();
            if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
          } else {
            console.log(`[CALL:${scope}] call update unhandled status`, { sessionId: call.id, status: call.status });
            if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
          }
        }
      } catch (err) {
        console.error(`[CALL:${scope}] SSE call_update error`, err);
      }
    };

    const handleSignal = (e: MessageEvent) => {
      try {
        const sig = JSON.parse(e.data);
        console.log(`[CALL:${scope}] SSE call_signal received`, { signalId: sig.id, signalType: sig.signalType, senderId: sig.senderId, dataLength: sig.signalData?.length });
        if (sig.signalType === 'end') {
          console.log(`[CALL:${scope}] remote ended call`, { sessionId: sig.callSessionId });
          stopAllRings(); stopTitleFlash();
          webrtcEndCallRef.current('remote_ended');
        } else if (sig.signalType === 'reject') {
          console.log(`[CALL:${scope}] remote rejected call`, { sessionId: sig.callSessionId });
          stopAllRings(); stopTitleFlash();
          webrtcEndCallRef.current('rejected');
        } else {
          console.log(`[CALL:${scope}] forwarding signal to WebRTC`, { signalType: sig.signalType });
          webrtcHandleSignalRef.current(sig.signalType, sig.signalData);
        }
      } catch (err) {
        console.error(`[CALL:${scope}] SSE call_signal error`, err);
      }
    };

    return { handleIncoming, handleUpdate, handleSignal };
  }, [profile, fetchProfile, showBrowserNotification, startTitleFlash, stopTitleFlash]);

  useEffect(() => {
    if (!profile) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Staff-to-staff call stream
    if (modes.includes('social')) {
      const es = new EventSource('/api/call/stream');
      esRef.current = es;
      const handlers = createSSEHandlers('social');
      es.addEventListener('incoming_call', handlers.handleIncoming as any);
      es.addEventListener('call_update', handlers.handleUpdate as any);
      es.addEventListener('call_signal', handlers.handleSignal as any);
      es.addEventListener('error', (e: any) => {
        console.error('[CALL:social] SSE stream error', e?.message || e);
      });

      return () => {
        es.close();
        esRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Customer-social call stream (separate useEffect so both can run simultaneously)
  useEffect(() => {
    if (!profile) return;
    if (!modes.includes('customer')) return;

    const es = new EventSource('/api/customer-call/stream');
    customerEsRef.current = es;
    const handlers = createSSEHandlers('customer');
    es.addEventListener('incoming_call', handlers.handleIncoming as any);
    es.addEventListener('call_update', handlers.handleUpdate as any);
    es.addEventListener('call_signal', handlers.handleSignal as any);
    es.addEventListener('error', (e: any) => {
      console.error('[CALL:customer] SSE stream error', e?.message || e);
    });

    return () => {
      es.close();
      customerEsRef.current = null;
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      stopAllRings();
      stopTitleFlash();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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
