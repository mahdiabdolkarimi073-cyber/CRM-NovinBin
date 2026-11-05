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

function boostAudioBitrate(sdp: string): string {
  const lines = sdp.split('\r\n');
  let mLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('m=audio')) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === -1) return sdp;

  let opusPayload = '';
  for (let i = mLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('m=')) break;
    const parts = lines[i].split(' ');
    if (parts.length >= 2 && parts[0] === 'a=rtpmap:' && parts[1].includes('opus/48000')) {
      opusPayload = parts[0].substring('a=rtpmap:'.length).split('/')[0];
      break;
    }
  }
  if (!opusPayload) return sdp;

  const fmtpLine = `a=fmtp:${opusPayload} minptime=10;useinbandfec=1;maxaveragebitrate=510000;stereo=1;`;
  let sdpModified = '';
  let fmtpInserted = false;
  for (let i = 0; i < lines.length; i++) {
    sdpModified += lines[i] + '\r\n';
    if (!fmtpInserted && lines[i].startsWith(`a=rtpmap:${opusPayload}`)) {
      sdpModified += fmtpLine + '\r\n';
      fmtpInserted = true;
    }
  }
  if (!fmtpInserted) {
    sdpModified += fmtpLine + '\r\n';
  }
  return sdpModified;
}

async function setSenderBitrate(pc: RTCPeerConnection): Promise<void> {
  const senders = pc.getSenders();
  for (const sender of senders) {
    if (sender.track?.kind === 'audio' && sender.transport) {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      if (params.encodings.length > 0) {
        params.encodings[0].maxBitrate = 510000;
        try {
          await sender.setParameters(params);
          console.log('[WEBRTC] audio sender maxBitrate set to 510kbps');
        } catch (e) {
          console.warn('[WEBRTC] failed to set audio sender bitrate', e);
        }
      }
    }
  }
}

export function useWebRTC(apiPrefixRef: MutableRefObject<string>) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mixedStreamRef = useRef<MediaStream | null>(null);

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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WEBRTC] ICE candidate generated', { candidateType: event.candidate.candidate?.split(' ')[7] || 'unknown', sdpMLineIndex: event.candidate.sdpMLineIndex });
        fetch(`${apiPrefixRef.current}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSessionId: sessionId,
            receiverId: remoteUserId,
            signalType: 'ice',
            signalData: JSON.stringify(event.candidate),
          }),
        }).then(() => console.log('[WEBRTC] ICE candidate sent successfully')).catch((e) => console.error('[WEBRTC] ICE candidate send failed', e));
      } else {
        console.log('[WEBRTC] ICE gathering complete', { iceGatheringState: pc.iceGatheringState });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ICE connection state changed', { state: pc.iceConnectionState, gatheringState: pc.iceGatheringState });
      if (pc.iceConnectionState === 'connected') {
        console.log('[WEBRTC] ICE connected — peer-to-peer link established');
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn('[WEBRTC] ICE disconnected — network issue detected');
      } else if (pc.iceConnectionState === 'failed') {
        console.error('[WEBRTC] ICE failed — NAT traversal may have failed, consider TURN server');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] connection state changed', { state: pc.connectionState });
      if (pc.connectionState === 'connected') {
        console.log('[WEBRTC] PeerConnection established successfully');
      } else if (pc.connectionState === 'failed') {
        console.error('[WEBRTC] PeerConnection failed');
        updateState({ status: 'failed', error: 'اتصال قطع شد' });
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[WEBRTC] PeerConnection disconnected');
      } else if (pc.connectionState === 'closed') {
        console.log('[WEBRTC] PeerConnection closed');
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[WEBRTC] signaling state changed', { state: pc.signalingState });
    };

    pc.ontrack = (event) => {
      console.log('[WEBRTC] ontrack received', { trackKind: event.track.kind, streams: event.streams.length, trackEnabled: event.track.enabled, trackState: event.track.readyState });
      const stream = event.streams[0];
      if (!stream) {
        console.warn('[WEBRTC] ontrack: no stream in event, creating from track');
        const newStream = new MediaStream([event.track]);
        remoteStreamRef.current = newStream;
        updateState({ remoteStream: newStream });
      } else {
        remoteStreamRef.current = stream;
        updateState({ remoteStream: stream });
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        console.log('[WEBRTC] remote video srcObject set');
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().then(() => console.log('[WEBRTC] remote audio playing')).catch((e) => console.warn('[WEBRTC] remote audio play failed', e));
      }
      console.log('[WEBRTC] remote stream tracks', { audio: remoteStreamRef.current?.getAudioTracks().length || 0, video: remoteStreamRef.current?.getVideoTracks().length || 0 });
      // Add remote audio track to recording if recorder is active
      try {
        const remoteAudioTrack = stream.getAudioTracks()[0];
        if (remoteAudioTrack && mixedStreamRef.current && !mixedStreamRef.current.getAudioTracks().some((t) => t.id === remoteAudioTrack.id)) {
          mixedStreamRef.current.addTrack(remoteAudioTrack);
        }
      } catch {}
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
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
      sampleSize: 16,
    };
    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
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

      // Start recording — mix local + remote audio
      try {
        const recTracks: MediaStreamTrack[] = [];
        const localAudio = stream.getAudioTracks()[0];
        if (localAudio) recTracks.push(localAudio);
        const remoteAudioTrack = remoteStreamRef.current?.getAudioTracks()[0];
        if (remoteAudioTrack) recTracks.push(remoteAudioTrack);
        if (recTracks.length > 0) {
          const recStream = new MediaStream(recTracks);
          mixedStreamRef.current = recStream;
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
          const recorder = new MediaRecorder(recStream, { mimeType });
          recordedChunksRef.current = [];
          recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
          };
          recorder.start(1000);
          mediaRecorderRef.current = recorder;
          console.log('[WEBRTC] call recording started', { mimeType, tracks: recTracks.length });
        }
      } catch (recErr) {
        console.warn('[WEBRTC] failed to start recording', recErr);
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
      const boostedOffer = { ...offer, sdp: boostAudioBitrate(offer.sdp || '') };
      await pc.setLocalDescription(boostedOffer);
      console.log('[WEBRTC] offer created & setLocalDescription done', { type: offer.type, sdpLength: offer.sdp?.length });

      await setSenderBitrate(pc);

      console.log('[WEBRTC] sending offer via', apiPrefixRef.current + '/signal');
      const sigRes = await fetch(`${apiPrefixRef.current}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'offer',
          signalData: JSON.stringify(boostedOffer),
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
      const boostedAnswer = { ...answer, sdp: boostAudioBitrate(answer.sdp || '') };
      await pc.setLocalDescription(boostedAnswer);
      console.log('[WEBRTC] answer created & setLocalDescription done');

      await setSenderBitrate(pc);

      console.log('[WEBRTC] sending answer via', apiPrefixRef.current + '/signal');
      const sigRes = await fetch(`${apiPrefixRef.current}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: sessionId,
          receiverId: remoteUserId,
          signalType: 'answer',
          signalData: JSON.stringify(boostedAnswer),
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
    console.log('[WEBRTC] handleSignal received', { signalType, hasPC: !!pc, pcSignalingState: pc?.signalingState, dataLength: signalData?.length });
    if (!pc) {
      if (signalType === 'ice') {
        try {
          const candidate = new RTCIceCandidate(JSON.parse(signalData));
          pendingCandidatesRef.current.push(candidate);
          console.log('[WEBRTC] ICE candidate buffered (no PC yet)', { pending: pendingCandidatesRef.current.length });
        } catch (err) {
          console.error('[WEBRTC] failed to buffer ICE candidate (no PC)', err);
        }
      } else if (signalType === 'offer') {
        console.log('[WEBRTC] offer signal received but no PC yet — will be handled by acceptCall from server session');
      } else {
        console.warn('[WEBRTC] handleSignal called but no PeerConnection exists', { signalType });
      }
      return;
    }

    try {
      if (signalType === 'answer') {
        const answer = JSON.parse(signalData) as RTCSessionDescriptionInit;
        console.log('[WEBRTC] setting remote description (answer)', { type: answer.type, sdpLength: answer.sdp?.length });
        await pc.setRemoteDescription(answer);
        console.log('[WEBRTC] setRemoteDescription(answer) done', { signalingState: pc.signalingState });
        updateState({ status: 'accepted' });
      } else if (signalType === 'ice') {
        const candidate = JSON.parse(signalData) as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WEBRTC] ICE candidate added', { candidateType: (candidate as any).candidate?.split(' ')[7] || 'unknown' });
        } else {
          pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
          console.log('[WEBRTC] ICE candidate queued (no remote description yet)', { pending: pendingCandidatesRef.current.length });
        }
      } else {
        console.warn('[WEBRTC] handleSignal: unhandled signalType', signalType);
      }
    } catch (err) {
      console.error('[WEBRTC] handleSignal error', { signalType, error: err, message: (err as Error)?.message });
    }
  }, [updateState]);

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

  const stopAndUploadRecording = useCallback(async (): Promise<string | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      mediaRecorderRef.current = null;
      mixedStreamRef.current = null;
      recordedChunksRef.current = [];
      return null;
    }
    return new Promise<string | null>((resolve) => {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          recordedChunksRef.current = [];
          mediaRecorderRef.current = null;
          mixedStreamRef.current = null;
          if (blob.size === 0) { resolve(null); return; }
          const formData = new FormData();
          formData.append('file', blob, `call-recording-${Date.now()}.webm`);
          const res = await fetch('/api/upload/call-recording', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) { console.warn('[WEBRTC] recording upload failed', data); resolve(null); return; }
          console.log('[WEBRTC] recording uploaded', data.url);
          resolve(data.url as string);
        } catch (e) {
          console.warn('[WEBRTC] recording upload error', e);
          resolve(null);
        }
      };
      try { recorder.stop(); } catch { resolve(null); }
    });
  }, []);

  const endCall = useCallback(async (reason?: string) => {
    console.log('[WEBRTC] endCall begin', { reason, sessionId: state.sessionId, status: state.status });
    const recordingUrl = await stopAndUploadRecording();
    const pc = pcRef.current;
    if (pc) {
      console.log('[WEBRTC] closing PeerConnection', { connectionState: pc.connectionState, iceConnectionState: pc.iceConnectionState });
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
      console.log('[WEBRTC] sending end signal to server', { sessionId: state.sessionId, reason, recordingUrl });
      await fetch(`${apiPrefixRef.current}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId, reason, recordingUrl }),
      }).then(() => console.log('[WEBRTC] end signal sent')).catch((e) => console.warn('[WEBRTC] end signal failed', e));
    }

    updateState({ status: 'ended', localStream: null, remoteStream: null });
    setTimeout(() => updateState({ status: 'idle', sessionId: null, remoteUserId: null }), 1500);
  }, [state.sessionId, state.status, updateState, stopAndUploadRecording]);

  const rejectCall = useCallback(async (sessionId: string) => {
    console.log('[WEBRTC] rejectCall', { sessionId });
    await fetch(`${apiPrefixRef.current}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(() => console.log('[WEBRTC] reject signal sent')).catch((e) => console.warn('[WEBRTC] reject signal failed', e));
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
