import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Upload limits. Storage crossed the 1GB quota on 2026-08-14 and every endpoint — auth
 * included — began returning 402, so nothing anyone uploads should be able to grow the
 * bucket without bound.
 */
// Generous, because images are re-encoded below — this only guards against decoding
// something absurd. A normal 12MP phone photo is ~9MB and must not be rejected when we are
// about to compress it to well under 1.5MB anyway.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;
/** What a compressed image should land under. Quality steps down until it does. */
const TARGET_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

/**
 * Re-encode to WebP, downscaling to MAX_IMAGE_EDGE and stepping quality down until the result
 * is under TARGET_IMAGE_BYTES. A single fixed quality is not enough — a detailed 12MP photo at
 * q0.8 can still land several MB, which is how the bucket filled up.
 *
 * Falls back to the original on any failure, and keeps the original if it is already smaller.
 */
const compressImage = async (file: File): Promise<File> => {
  // GIFs are animated; a canvas round-trip would silently flatten them to one frame.
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!img) return file;

    let { width, height } = img;
    // Bound the longest edge, so portrait photos are limited too. Never upscale.
    const longest = Math.max(width, height);
    if (longest > MAX_IMAGE_EDGE) {
      const scale = MAX_IMAGE_EDGE / longest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let best: Blob | null = null;
    for (const quality of [0.8, 0.7, 0.6, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) break;
      best = blob;
      if (blob.size <= TARGET_IMAGE_BYTES) break;
    }

    if (!best || best.size >= file.size) return file;
    return new File([best], file.name.replace(/\.\w+$/, '') + '.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    // The original code never revoked this, leaking the decoded image for the session.
    URL.revokeObjectURL(url);
  }
};

/** Duration in seconds, or null if it can't be read. */
const videoDuration = (file: File): Promise<number | null> => {
  const url = URL.createObjectURL(file);
  return new Promise<number | null>((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => resolve(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => resolve(null);
    el.src = url;
  }).finally(() => URL.revokeObjectURL(url));
};

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadImage = async (
    file: File,
    bucket: string = 'community-images'
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload images',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file type
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const validTypes = [...imageTypes, ...videoTypes];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, GIF, WebP image or MP4, WebM video',
        variant: 'destructive',
      });
      return null;
    }

    // Images are re-encoded below, so their limit only guards the decode. Video cannot be
    // transcoded in a WebView, so whatever is accepted here is what we store forever.
    const isVideo = videoTypes.includes(file.type);
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `That ${isVideo ? 'video' : 'image'} is ${mb(file.size)}. The limit is ${mb(maxSize)}.`,
        variant: 'destructive',
      });
      return null;
    }

    if (isVideo) {
      const seconds = await videoDuration(file);
      if (seconds !== null && seconds > MAX_VIDEO_SECONDS) {
        toast({
          title: 'Video too long',
          description: `That video is ${Math.round(seconds)} seconds. Please keep videos under ${MAX_VIDEO_SECONDS}.`,
          variant: 'destructive',
        });
        return null;
      }
    }

    setUploading(true);

    try {
      // Compress images before upload
      const processedFile = isVideo ? file : await compressImage(file);

      // Generate unique file name with user folder. Fall back on the MIME type — a file
      // picked from some Android providers arrives with no extension in its name.
      const fileExt = processedFile.name.includes('.')
        ? processedFile.name.split('.').pop()
        : processedFile.type.split('/').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (
    imageUrl: string,
    bucket: string = 'community-images'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Extract file path from URL
      const urlParts = imageUrl.split(`${bucket}/`);
      if (urlParts.length < 2) return false;

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
  };
};
