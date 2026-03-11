import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    // Skip compression for GIFs (animated) and non-image files
    if (file.type === 'image/gif' || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Only downscale, never upscale
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            // Use compressed version only if it's actually smaller
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressed);
          } else {
            resolve(file);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
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

    // Validate file size (max 20MB for videos, 5MB for images)
    const isVideo = videoTypes.includes(file.type);
    const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: isVideo ? 'Please upload a video smaller than 20MB' : 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);

    try {
      // Compress images before upload
      const processedFile = isVideo ? file : await compressImage(file);

      // Generate unique file name with user folder
      const fileExt = processedFile.name.split('.').pop();
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
