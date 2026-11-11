import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, User, Loader2 } from 'lucide-react';
import { validateImageFile, compressProfileImage, fileToDataUrl } from '@/lib/validateImage';
import api from '@/services/apiClient';
import toast from 'react-hot-toast';

export function ProfilePhotoUploader({ currentAvatar, userName = 'Member', onAvatarChange }) {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentAvatar]);

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PL';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProcessing(true);
    try {
      const compressed = await compressProfileImage(file);
      let avatarUrl;
      try {
        const formData = new FormData();
        // Append category BEFORE file so multer parses category correctly in stream
        formData.append('category', 'avatar');
        formData.append('file', compressed, file.name);
        const res = await api.upload('/media/upload', formData);
        avatarUrl = res.data?.url;
      } catch (uploadErr) {
        // Fallback to dataUrl if upload endpoint fails
        avatarUrl = await fileToDataUrl(compressed);
      }
      setImageError(false);
      onAvatarChange(avatarUrl);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error('Failed to process image');
      console.error(err);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setImageError(false);
    onAvatarChange(null);
    toast.success('Profile picture removed');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-sand/35 border border-charcoal/15">
      {/* Avatar Preview */}
      <div className="relative shrink-0">
        {currentAvatar && !imageError ? (
          <img
            src={currentAvatar}
            alt={userName}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              setImageError(true);
            }}
            className="w-16 h-16 rounded-full object-cover border-2 border-charcoal/20 shadow-xs"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-deep-purple text-porcelain flex items-center justify-center font-serif text-xl font-medium border-2 border-charcoal/20 shadow-xs">
            {initials}
          </div>
        )}
        {processing && (
          <div className="absolute inset-0 bg-charcoal/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-porcelain animate-spin" />
          </div>
        )}
      </div>

      {/* Controls & Description */}
      <div className="flex-1 space-y-1.5">
        <div className="font-mono text-xs uppercase tracking-wider text-charcoal font-semibold">
          Profile Photo
        </div>
        <p className="font-sans text-xs text-dark-gray/60 leading-relaxed">
          Upload a formal portrait or brokerage photo. Accepted formats: JPG, PNG, WebP (compressed under 150KB automatically).
        </p>
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/80 hover:bg-sand border border-charcoal/20 text-charcoal font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[36px]"
          >
            <Camera className="w-3.5 h-3.5 text-deep-purple" />
            <span>{currentAvatar ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {currentAvatar && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 border border-charcoal/10 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
