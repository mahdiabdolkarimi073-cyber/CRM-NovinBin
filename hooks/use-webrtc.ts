'use client';

import { useRef, useState, useCallback, useEffect, type MutableRefObject } from 'react';
import type { CallType, CallStatus } from '@/lib/types';

interface WebRTCCallState {
  status: CallStatus | 'idle';
  callType: CallType;
  sessionId: string | null;
  remoteUserId: string | null;
  isCaller: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC(apiPrefixRef: MutableRefObject<string>) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const [state, setState] = useState<WebRTCCallState>({
    status: 'idle',
    callType: 'audio',
    sessionId: null,
    remoteUserId: null,
    isCaller: false,
    micEnabled: true,
    cameraEnabled: true,
    localStream: null,
    remoteStream: null,
    error: null,
  });

  const updateState = useCallback((partial: Partial<WebRTCCallState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const createPeerConnection = useCallback((sessionId: string, remoteUserId: string, isCaller: boolean) => {
    console.log('[WEBRTC] createPeerConnection', { sessionId, remoteUserId, isCaller });
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[WEBRTC] ontrack received', { streams: event.streams.length });
      const stream = event.streams[0];
      remoteStreamRef.current = stream;
      updateState({ remoteStream: stream });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WEBRTC] ICE candidate generated');
        fetch(`${apiPrefixRef.current}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSessionId: sessionId,
            receiverId: remoteUserId,
            signalType: 'ice',
            signalData: JSON.stringify(event.candidate),
          }),
        }).catch((e) => console.error('[WEBRTC] ICE candidate send failed', e));
      } else {
        console.log('[WEBRTC] ICE gathering complete');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ICE connection state', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] connection state', pc.connectionState);
      if (pc.connectionState === 'failed') {
        updateState({ status: 'failed', error: 'اتصال قطع شد' });
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[WEBRTC] signaling state', pc.signalingState);
    };

    return pc;
  }, [updateState]);

  function formatMediaError(e: any): string {
    const name = e?.name || '';
    const msg = e?.message || '';
    console.error('[WEBRTC] media error', { name, message: msg });
    if (name === 'NotFoundError') {
      return 'میکروفون یا دوربین روی دستگاه شما یافت نشد. لطفاً یک میکروفون متصل کنید و دوباره تلاش کنید.';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'دسترسی به میکروفون/دوربین داده نشده. لطفاً در تنظیمات مرورگر اجازه دسترسی بدهید.';
    }
    if (name === 'NotReadableError') {
      return 'میکروفون/دوربین توسط برنامه دیگری در حال استفاده است. لطفاً آن برنامه را ببندید.';
    }
    if (name === 'OverconstrainedError') {
      return 'دستگاه شما شرایط مورد نیاز برای تماس را پشتیبانی نمی‌کند.';
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'مرورگر شما از تماس صوتی/تصویری پشتیبانی نمی‌کند. لطفاً از مرورگر Chrome یا Firefox استفاده کنید.';
    }
    return 'خطا در دسترسی به میکروفون/دوربین: ' + (msg || name || 'نامشخص');
  }

  const getLocalMedia = useCallback(async (callType: CallType): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video',
    };
    console.log('[WEBRTC] getUserMedia constraints', constraints);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('مرورگر شما از تماس صوتی/تصویری پشتیبانی نمی‌کند. لطفاً از مرورگر Chrome یا Firefox استفاده کنید.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WEBRTC] getUserMedia success', { audioTracks: stream.getAudioTracks().length, videoTracks: stream.getVideoTracks().length });
      localStreamRef.current = stream;
      updateState({
        localStream: stream,
        micEnabled: true,
        cameraEnabled: callType === 'video',
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (e: any) {
      throw new Error(formatMediaError(e));
    }
  }, [updateState]);

  const startCall = useCallback(async (
    sessionId: string,
    remoteUserId: string,
    callType: CallType
  ) => {
    try {
      console.log('[WEBRTC] startCall begin', { sessionId, remoteUserId, callType });
      updateState({ status: 'calling', callType, sessionId, remoteUserId, isCaller: true, error: null });
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(sessionId, remoteUserId, true);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      console.log('[WEBRTC] tracks added to PC', { count: stream.getTracks().length });

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(offer);
      console.log('[WEBRTC] offer created & setLocalDescription done', { type: offer.type, sdpLength: offer.sdp?.length });

      console.log('[WEBRTC] sending offer via', apiPrefixRef.current + '/signal');
      const sigRes = await fetch(`${apiPrefixRef.current}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'offer',
          signalData: JSON.stringify(offer),
        }),
      });
      const sigData = await sigRes.json();
      console.log('[WEBRTC] signal response', { status: sigRes.status, data: sigData });
      if (!sigRes.ok) {
        throw new Error('ارسال سیگنال offer ناموفق بود: ' + (sigData.error || sigRes.status));
      }
      console.log('[WEBRTC] startCall completed successfully');
    } catch (e: any) {
      console.error('[WEBRTC] startCall failed', e);
      updateState({ status: 'failed', error: e.message || 'خطا در برقراری تماس' });
      if (sessionId) {
        fetch(`${apiPrefixRef.current}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, reason: 'media_failed' }),
        }).catch(() => {});
      }
    }
  }, [createPeerConnection, getLocalMedia, updateState]);

  const acceptCall = useCallback(async (
    sessionId: string,
    remoteUserId: string,
    callType: CallType,
    offerSdp: string
  ) => {
    try {
      console.log('[WEBRTC] acceptCall begin', { sessionId, remoteUserId, callType, offerSdpLength: offerSdp?.length });
      updateState({ status: 'accepted', callType, sessionId, remoteUserId, isCaller: false, error: null });
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(sessionId, remoteUserId, false);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      console.log('[WEBRTC] setRemoteDescription(offer) done');

      const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(answer);
      console.log('[WEBRTC] answer created & setLocalDescription done');

      console.log('[WEBRTC] sending answer via', apiPrefixRef.current + '/signal');
      const sigRes = await fetch(`${apiPrefixRef.current}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'answer',
          signalData: JSON.stringify(answer),
        }),
      });
      const sigData = await sigRes.json();
      console.log('[WEBRTC] signal response', { status: sigRes.status, data: sigData });
      if (!sigRes.ok) {
        throw new Error('ارسال سیگنال answer ناموفق بود: ' + (sigData.error || sigRes.status));
      }

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidatesRef.current = [];

      updateState({ status: 'accepted' });
      console.log('[WEBRTC] acceptCall completed successfully');
    } catch (e: any) {
      console.error('[WEBRTC] acceptCall failed', e);
      updateState({ status: 'failed', error: e.message || 'خطا در پاسخ به تماس' });
      if (sessionId) {
        fetch(`${apiPrefixRef.current}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, reason: 'media_failed' }),
        }).catch(() => {});
      }
    }
  }, [createPeerConnection, getLocalMedia, updateState]);

  const handleSignal = useCallback(async (signalType: string, signalData: string) => {
    const pc = pcRef.current;
    if (!pc) {
      console.warn('[WEBRTC] handleSignal called but no PC', { signalType });
      return;
    }

    try {
      if (signalType === 'answer') {
        const answer = JSON.parse(signalData) as RTCSessionDescriptionInit;
        console.log('[WEBRTC] setting remote description (answer)');
        await pc.setRemoteDescription(answer);
        console.log('[WEBRTC] setRemoteDescription(answer) done');
      } else if (signalType === 'ice') {
        const candidate = JSON.parse(signalData) as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WEBRTC] ICE candidate added');
        } else {
          pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
          console.log('[WEBRTC] ICE candidate queued (no remote description yet)', { pending: pendingCandidatesRef.current.length });
        }
      }
    } catch (err) {
      console.error('[WEBRTC] handleSignal error', { signalType, error: err });
    }
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      updateState({ micEnabled: audioTrack.enabled });
    }
  }, [updateState]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      updateState({ cameraEnabled: videoTrack.enabled });
    }
  }, [updateState]);

  const endCall = useCallback(async (reason?: string) => {
    const pc = pcRef.current;
    if (pc) {
      pc.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingCandidatesRef.current = [];

    if (state.sessionId) {
      await fetch(`${apiPrefixRef.current}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, reason }),
      }).catch(() => {});
    }

    updateState({ status: 'ended', localStream: null, remoteStream: null });
    setTimeout(() => updateState({ status: 'idle', sessionId: null, remoteUserId: null }), 1500);
  }, [state.sessionId, updateState]);

  const rejectCall = useCallback(async (sessionId: string) => {
    await fetch(`${apiPrefixRef.current}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    updateState({ status: 'rejected' });
    setTimeout(() => updateState({ status: 'idle', sessionId: null, remoteUserId: null }), 1500);
  }, [updateState]);

  useEffect(() => {
    return () => {
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    state,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleSignal,
    toggleMic,
    toggleCamera,
  };
}
