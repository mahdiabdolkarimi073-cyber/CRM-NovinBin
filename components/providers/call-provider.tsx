'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useWebRTC } from '@/hooks/use-webrtc';
import { CallOverlay } from '@/components/call/call-overlay';
import { toast } from 'sonner';
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
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const res = await fetch(`/api/data?model=profiles&where=${encodeURIComponent(JSON.stringify({ id: userId }))}`);
      const json = await res.json();
      return json?.data?.[0] || null;
    } catch {
      return null;
    }
  }, []);

  const handleStartCall = useCallback(async (remoteUser: Profile, callType: 'audio' | 'video') => {
    if (!profile) {
      console.error('[CALL] startCall failed: no profile');
      toast.error('کاربر احراز هویت نشده');
      return;
    }
    console.log('[CALL] startCall initiated', { callerId: profile.id, receiverId: remoteUser.id, callType });
    try {
      console.log('[CALL] POST /api/call/initiate');
      const res = await fetch('/api/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: remoteUser.id, callType }),
      });
      const data = await res.json();
      console.log('[CALL] initiate response', { status: res.status, data });
      if (!res.ok) {
        console.error('[CALL] initiate failed', { status: res.status, error: data.error });
        toast.error(data.error || 'خطا در برقراری تماس');
        return;
      }
      const session: SocialCallSession = data.session;
      console.log('[CALL] session created', { sessionId: session.id });
      console.log('[CALL] starting WebRTC...');
      await webrtc.startCall(session.id, remoteUser.id, callType);
      console.log('[CALL] WebRTC startCall completed');
    } catch (e: any) {
      console.error('[CALL] startCall exception', e);
      toast.error('خطا در برقراری تماس: ' + (e?.message || e));
    }
  }, [profile, webrtc]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    console.log('[CALL] acceptCall initiated', { sessionId: incomingCall.id });
    try {
      const res = await fetch('/api/call/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: incomingCall.id }),
      });
      const data = await res.json();
      console.log('[CALL] accept response', { status: res.status, data });
      if (!res.ok) {
        console.error('[CALL] accept failed', { status: res.status, error: data.error });
        toast.error(data.error || 'پاسخ به تماس ناموفق بود');
        return;
      }
      if (ringAudioRef.current) ringAudioRef.current.pause();
      const offerSdp = incomingCall.offerSdp;
      console.log('[CALL] offerSdp present?', !!offerSdp);
      if (offerSdp) {
        await webrtc.acceptCall(incomingCall.id, incomingCall.callerId, incomingCall.callType as 'audio' | 'video', offerSdp);
        console.log('[CALL] WebRTC acceptCall completed');
      } else {
        console.error('[CALL] no offerSdp in incoming call');
        toast.error('اطلاعات تماس ناقص است');
      }
      setIncomingCall(null);
    } catch (e: any) {
      console.error('[CALL] acceptCall exception', e);
      toast.error('پاسخ به تماس ناموفق بود: ' + (e?.message || e));
    }
  }, [incomingCall, profile, webrtc]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;
    if (ringAudioRef.current) ringAudioRef.current.pause();
    await webrtc.rejectCall(incomingCall.id);
    setIncomingCall(null);
    setCallerProfile(null);
  }, [incomingCall, webrtc]);

  const handleEndCall = useCallback(() => {
    if (ringAudioRef.current) ringAudioRef.current.pause();
    webrtc.endCall();
  }, [webrtc]);

  useEffect(() => {
    if (webrtc.state.error) {
      console.error('[CALL] WebRTC state error', webrtc.state.error);
      toast.error(webrtc.state.error);
    }
  }, [webrtc.state.error]);

  useEffect(() => {
    if (!profile) return;

    const es = new EventSource('/api/call/stream');
    esRef.current = es;

    es.addEventListener('incoming_call', async (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        console.log('[CALL] SSE incoming_call', call);
        if (call.receiverId === profile.id && (call.status === 'calling' || call.status === 'ringing')) {
          setIncomingCall(call);
          const cp = await fetchProfile(call.callerId);
          console.log('[CALL] caller profile fetched', cp ? cp.id : 'null');
          setCallerProfile(cp);
          if (ringAudioRef.current) {
            ringAudioRef.current.loop = true;
            ringAudioRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.error('[CALL] SSE incoming_call error', err);
      }
    });

    es.addEventListener('call_update', (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        console.log('[CALL] SSE call_update', call);
        if (call.callerId === profile.id) {
          if (call.status === 'rejected') {
            if (ringAudioRef.current) ringAudioRef.current.pause();
            toast.info('تماس رد شد');
            webrtc.endCall('rejected');
          } else if (call.status === 'ended') {
            if (ringAudioRef.current) ringAudioRef.current.pause();
            webrtc.endCall('ended');
          } else if (call.status === 'missed') {
            if (ringAudioRef.current) ringAudioRef.current.pause();
            toast.info('تماس پاسخ داده نشد');
            webrtc.endCall('missed');
          }
        }
      } catch (err) {
        console.error('[CALL] SSE call_update error', err);
      }
    });

    es.addEventListener('call_signal', (e) => {
      try {
        const sig = JSON.parse(e.data);
        console.log('[CALL] SSE call_signal', { signalType: sig.signalType, hasData: !!sig.signalData });
        if (sig.signalType === 'end') {
          if (ringAudioRef.current) ringAudioRef.current.pause();
          webrtc.endCall('remote_ended');
        } else if (sig.signalType === 'reject') {
          if (ringAudioRef.current) ringAudioRef.current.pause();
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
    };
  }, [profile, webrtc, fetchProfile]);

  const ringToneUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  return (
    <CallContext.Provider value={{ startCall: handleStartCall, endCall: handleEndCall, toggleMic: webrtc.toggleMic, toggleCamera: webrtc.toggleCamera }}>
      {children}
      <audio ref={ringAudioRef} src={ringToneUrl} preload="auto" />
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
