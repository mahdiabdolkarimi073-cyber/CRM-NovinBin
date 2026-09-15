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
    if (!profile) return;
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
      await webrtc.startCall(session.id, remoteUser.id, callType);
    } catch {
      toast.error('خطا در برقراری تماس');
    }
  }, [profile, webrtc]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !profile) return;
    const res = await fetch('/api/call/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: incomingCall.id }),
    });
    if (!res.ok) {
      toast.error('پاسخ به تماس ناموفق بود');
      return;
    }
    if (ringAudioRef.current) ringAudioRef.current.pause();
    const offerSdp = incomingCall.offerSdp;
    if (offerSdp) {
      await webrtc.acceptCall(incomingCall.id, incomingCall.callerId, incomingCall.callType as 'audio' | 'video', offerSdp);
    }
    setIncomingCall(null);
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
    if (!profile) return;

    const es = new EventSource('/api/call/stream');
    esRef.current = es;

    es.addEventListener('incoming_call', async (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
        if (call.receiverId === profile.id && (call.status === 'calling' || call.status === 'ringing')) {
          setIncomingCall(call);
          const cp = await fetchProfile(call.callerId);
          setCallerProfile(cp);
          if (ringAudioRef.current) {
            ringAudioRef.current.loop = true;
            ringAudioRef.current.play().catch(() => {});
          }
        }
      } catch {}
    });

    es.addEventListener('call_update', (e) => {
      try {
        const call: SocialCallSession = JSON.parse(e.data);
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
      } catch {}
    });

    es.addEventListener('call_signal', (e) => {
      try {
        const sig = JSON.parse(e.data);
        if (sig.signalType === 'end') {
          if (ringAudioRef.current) ringAudioRef.current.pause();
          webrtc.endCall('remote_ended');
        } else if (sig.signalType === 'reject') {
          if (ringAudioRef.current) ringAudioRef.current.pause();
          webrtc.endCall('rejected');
        } else {
          webrtc.handleSignal(sig.signalType, sig.signalData);
        }
      } catch {}
    });

    es.addEventListener('error', () => {});

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
