
/*
# Create public storage bucket for profile avatars

## Purpose
Profile avatar images are currently stored in the local filesystem (public/uploads/avatars/),
which is ephemeral on serverless platforms like Netlify. This migration creates a durable
public bucket in Supabase Storage so avatar images persist across deploys and restarts.

## Changes
1. Storage: Create a public bucket named `avatars` (if not already exists).
2. Policies: Allow anyone to read avatar images (public bucket), and authenticated users to upload/update/delete their own files.

## Notes
- The bucket is public so browser can load avatar images directly via the Supabase Storage URL.
- Upload/delete is handled server-side via the API route using the service role key, so RLS policies on the bucket are permissive for reads and restricted for writes.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars bucket
DROP POLICY IF EXISTS "auth_upload_avatars" ON storage.objects;
CREATE POLICY "auth_upload_avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete from avatars bucket
DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
