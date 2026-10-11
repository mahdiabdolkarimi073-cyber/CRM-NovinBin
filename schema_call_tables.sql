-- WebRTC Call Tables for Social Network
-- Run this against your PostgreSQL database, or use: npx prisma db push

CREATE TABLE IF NOT EXISTS social_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'calling',
  offer_sdp text,
  answer_sdp text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  end_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES social_call_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_data text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON social_call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON social_call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_session ON social_call_signals(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver ON social_call_signals(receiver_id);
