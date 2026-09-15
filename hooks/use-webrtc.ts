'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
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

export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
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
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      remoteStreamRef.current = stream;
      updateState({ remoteStream: stream });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch('/api/call/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSessionId: sessionId,
            receiverId: remoteUserId,
            signalType: 'ice',
            signalData: JSON.stringify(event.candidate),
          }),
        }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        updateState({ status: 'failed', error: 'اتصال قطع شد' });
      }
    };

    return pc;
  }, [updateState]);

  const getLocalMedia = useCallback(async (callType: CallType): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video',
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
  }, [updateState]);

  const startCall = useCallback(async (
    sessionId: string,
    remoteUserId: string,
    callType: CallType
  ) => {
    try {
      updateState({ status: 'calling', callType, sessionId, remoteUserId, isCaller: true, error: null });
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(sessionId, remoteUserId, true);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(offer);

      await fetch('/api/call/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'offer',
          signalData: JSON.stringify(offer),
        }),
      });
    } catch (e: any) {
      updateState({ status: 'failed', error: e.message || 'خطا در برقراری تماس' });
    }
  }, [createPeerConnection, getLocalMedia, updateState]);

  const acceptCall = useCallback(async (
    sessionId: string,
    remoteUserId: string,
    callType: CallType,
    offerSdp: string
  ) => {
    try {
      updateState({ status: 'accepted', callType, sessionId, remoteUserId, isCaller: false, error: null });
      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(sessionId, remoteUserId, false);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(answer);

      await fetch('/api/call/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'answer',
          signalData: JSON.stringify(answer),
        }),
      });

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidatesRef.current = [];

      updateState({ status: 'accepted' });
    } catch (e: any) {
      updateState({ status: 'failed', error: e.message || 'خطا در پاسخ به تماس' });
    }
  }, [createPeerConnection, getLocalMedia, updateState]);

  const handleSignal = useCallback(async (signalType: string, signalData: string) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (signalType === 'answer') {
        const answer = JSON.parse(signalData) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(answer);
      } else if (signalType === 'ice') {
        const candidate = JSON.parse(signalData) as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        }
      }
    } catch {}
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
      await fetch('/api/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, reason }),
      }).catch(() => {});
    }

    updateState({ status: 'ended', localStream: null, remoteStream: null });
    setTimeout(() => updateState({ status: 'idle', sessionId: null, remoteUserId: null }), 1500);
  }, [state.sessionId, updateState]);

  const rejectCall = useCallback(async (sessionId: string) => {
    await fetch('/api/call/reject', {
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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleSignal,
    toggleMic,
    toggleCamera,
  };
}
