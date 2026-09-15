'use client';

import { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, PhoneCall, X } from 'lucide-react';
import type { SocialCallSession, Profile } from '@/lib/types';

interface CallOverlayProps {
  webrtc: ReturnType<typeof import('@/hooks/use-webrtc')['useWebRTC']>;
  incomingCall: SocialCallSession | null;
  callerProfile: Profile | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export function CallOverlay({ webrtc, incomingCall, callerProfile, onAccept, onReject, onEnd }: CallOverlayProps) {
  const { state, localVideoRef, remoteVideoRef, toggleMic, toggleCamera } = webrtc;
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const acceptedAtRef = useRef<number>(0);

  useEffect(() => {
    if (state.status === 'accepted') {
      if (acceptedAtRef.current === 0) acceptedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - acceptedAtRef.current) / 1000));
      }, 1000);
    } else {
      acceptedAtRef.current = 0;
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getInitials = (p: Profile | null) => {
    if (!p) return '؟';
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase() || '؟';
  };

  const getName = (p: Profile | null) => {
    if (!p) return 'کاربر';
    return [p.firstName, p.lastName].filter(Boolean).join(' ') || 'کاربر';
  };

  const statusText: Record<string, string> = {
    calling: 'در حال تماس گرفتن...',
    ringing: 'در حال زنگ خوردن...',
    accepted: 'تماس برقرار شد',
    rejected: 'تماس رد شد',
    missed: 'تماس پاسخ داده نشد',
    ended: 'تماس قطع شد',
    failed: 'خطا در برقراری تماس',
    idle: '',
  };

  if (incomingCall && state.status === 'idle') {
    return (
      <div className="call-overlay">
        <div className="call-incoming-card">
          <div className="call-incoming-avatar">
            <span>{getInitials(callerProfile)}</span>
          </div>
          <h2 className="call-incoming-name">{getName(callerProfile)}</h2>
          <div className="call-incoming-type">
            {incomingCall.callType === 'video' ? (
              <><Video style={{ width: 18, height: 18 }} /> تماس تصویری</>
            ) : (
              <><Phone style={{ width: 18, height: 18 }} /> تماس صوتی</>
            )}
          </div>
          <p className="call-incoming-status">در حال زنگ خوردن...</p>
          <div className="call-incoming-actions">
            <button className="call-btn-reject" onClick={onReject} aria-label="رد تماس">
              <PhoneOff style={{ width: 28, height: 28 }} />
            </button>
            <button className="call-btn-accept" onClick={onAccept} aria-label="پاسخ به تماس">
              <PhoneCall style={{ width: 28, height: 28 }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'idle' || state.status === 'ended' || state.status === 'rejected' || state.status === 'missed' || state.status === 'failed') {
    if (state.status !== 'idle') {
      return (
        <div className="call-overlay">
          <div className="call-ended-card">
            <div className="call-ended-icon">
              {state.status === 'failed' ? <X style={{ width: 40, height: 40 }} /> : <PhoneOff style={{ width: 40, height: 40 }} />}
            </div>
            <p className="call-ended-text">{statusText[state.status] || 'تماس پایان یافت'}</p>
          </div>
        </div>
      );
    }
    return null;
  }

  const isVideo = state.callType === 'video';

  return (
    <div className="call-overlay">
      <div className={isVideo ? 'call-active call-active-video' : 'call-active call-active-audio'}>
        {isVideo && (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="call-remote-video"
              muted={false}
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="call-local-video"
            />
          </>
        )}

        {!isVideo && (
          <div className="call-audio-view">
            <div className="call-audio-avatar">
              <span>{getInitials(callerProfile)}</span>
              <div className="call-audio-pulse" />
            </div>
          </div>
        )}

        <div className="call-info-bar">
          <h3 className="call-remote-name">{getName(callerProfile)}</h3>
          <p className="call-status-text">
            {state.status === 'accepted' ? formatDuration(callDuration) : statusText[state.status] || ''}
          </p>
        </div>

        <div className="call-controls">
          <button
            className={state.micEnabled ? 'call-control-btn' : 'call-control-btn call-control-off'}
            onClick={toggleMic}
            aria-label="میکروفون"
          >
            {state.micEnabled ? <Mic style={{ width: 22, height: 22 }} /> : <MicOff style={{ width: 22, height: 22 }} />}
          </button>

          {isVideo && (
            <button
              className={state.cameraEnabled ? 'call-control-btn' : 'call-control-btn call-control-off'}
              onClick={toggleCamera}
              aria-label="دوربین"
            >
              {state.cameraEnabled ? <Video style={{ width: 22, height: 22 }} /> : <VideoOff style={{ width: 22, height: 22 }} />}
            </button>
          )}

          <button className="call-control-btn call-control-end" onClick={onEnd} aria-label="قطع تماس">
            <PhoneOff style={{ width: 22, height: 22 }} />
          </button>
        </div>

        {state.error && (
          <div className="call-debug-panel">
            <p className="call-error">{state.error}</p>
            <div className="call-debug-details">
              <span>وضعیت: {state.status}</span>
              <span>نوع: {state.callType}</span>
              <span>session: {state.sessionId ? state.sessionId.slice(0, 8) : '—'}</span>
              <span>remote: {state.remoteUserId ? state.remoteUserId.slice(0, 8) : '—'}</span>
              <span>isCaller: {String(state.isCaller)}</span>
              <span>localStream: {state.localStream ? 'yes' : 'no'}</span>
              <span>remoteStream: {state.remoteStream ? 'yes' : 'no'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
