import { useState, useEffect, useRef } from 'react';
import {
  User, Image, Globe, Instagram, Youtube, Zap, ExternalLink,
  Eye, Copy, Check, CheckCircle, AlertCircle, Sparkles, Link,
  X, Save, Upload, Trash2, Camera, Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

interface PageData {
  tagline: string;
  cover_image_url: string;
  bio: string;
  promo_video_url: string;
  social_links: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    other?: string;
  };
}

export default function AthletePageEditor() {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pageData, setPageData] = useState<PageData>({
    tagline: '',
    cover_image_url: '',
    bio: '',
    promo_video_url: '',
    social_links: {},
  });
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');

  useEffect(() => {
    if (profile) {
      const coverUrl = (profile as any).cover_image_url || '';
      setPageData({
        tagline: (profile as any).tagline || '',
        cover_image_url: coverUrl,
        bio: profile.bio || '',
        promo_video_url: (profile as any).promo_video_url || '',
        social_links: (profile as any).social_links || {},
      });
      setCoverPreview(coverUrl);
      setSlug(profile.public_profile_slug || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!slug || slug === profile?.public_profile_slug) {
      setSlugAvailable(null);
      return;
    }
    const timer = setTimeout(() => checkSlug(slug), 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const checkSlug = async (value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (clean !== value) { setSlug(clean); return; }
    if (clean.length < 3) { setSlugAvailable(false); return; }
    setCheckingSlug(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('public_profile_slug', clean)
      .neq('id', profile?.id || '')
      .maybeSingle();
    setSlugAvailable(!data);
    setCheckingSlug(false);
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleCoverUpload = async (file: File) => {
    if (!profile?.id) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB', 'error'); return; }
    setUploadingCover(true);
    const localPreview = URL.createObjectURL(file);
    setCoverPreview(localPreview);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile.id}/cover.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('athlete-covers')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('athlete-covers').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setPageData(d => ({ ...d, cover_image_url: publicUrl }));
      setCoverPreview(publicUrl);
      showToast('Cover image uploaded', 'success');
    } catch {
      showToast('Error uploading image', 'error');
      setCoverPreview(pageData.cover_image_url);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!profile?.id) return;
    setUploadingCover(true);
    try {
      await supabase.storage.from('athlete-covers').remove([
        `${profile.id}/cover.jpg`, `${profile.id}/cover.jpeg`,
        `${profile.id}/cover.png`, `${profile.id}/cover.webp`,
      ]);
      setPageData(d => ({ ...d, cover_image_url: '' }));
      setCoverPreview('');
      showToast('Cover image removed', 'success');
    } catch {
      showToast('Error removing image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        tagline: pageData.tagline,
        cover_image_url: pageData.cover_image_url,
        bio: pageData.bio,
        promo_video_url: pageData.promo_video_url || null,
        social_links: pageData.social_links,
      };
      if (slug && (slugAvailable || slug === profile?.public_profile_slug)) {
        updates.public_profile_slug = slug;
      }
      await updateProfile(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showToast('Page saved successfully', 'success');
    } catch {
      showToast('Error saving page', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    const url = `https://hub.asciende.pro/athlete/${slug || profile?.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = `https://hub.asciende.pro/athlete/${slug || profile?.id}`;
  const setSocial = (key: string, value: string) => {
    setPageData(d => ({ ...d, social_links: { ...d.social_links, [key]: value } }));
  };

  const videoId = extractYouTubeId(pageData.promo_video_url);

  return (
    <div className="space-y-6">

      {/* Public URL banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#fdda36]" />
              <span className="text-sm font-bold text-white">Your Public Page</span>
            </div>
            <p className="text-[#fdda36]/80 text-xs font-mono break-all">{previewUrl}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-teal-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#fdda36] text-[#514163] text-xs font-semibold rounded-lg hover:bg-[#ffd51a] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </a>
          </div>
        </div>
      </div>

      {/* Username */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Link className="w-4 h-4 text-[#fdda36]" />
          Username
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Your page will be at <span className="font-mono text-[#fdda36]">hub.asciende.pro/athlete/{slug || 'yourname'}</span>
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-l-lg text-sm text-gray-500 dark:text-gray-400 border-r-0 font-mono">
            athlete/
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase())}
            placeholder="yourname"
            maxLength={30}
            className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-r-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
          />
          <div className="w-6 flex-shrink-0">
            {checkingSlug && <div className="w-4 h-4 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" />}
            {!checkingSlug && slugAvailable === true && <CheckCircle className="w-4 h-4 text-teal-500" />}
            {!checkingSlug && slugAvailable === false && <X className="w-4 h-4 text-red-500" />}
          </div>
        </div>
        {slugAvailable === false && slug.length >= 3 && (
          <p className="text-xs text-red-500 mt-2">This username is already taken or invalid (min 3 chars)</p>
        )}
        {slugAvailable === true && (
          <p className="text-xs text-teal-500 mt-2">Username is available!</p>
        )}
      </div>

      {/* Cover Image */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Image className="w-4 h-4 text-[#fdda36]" />
          Cover Image
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Full-bleed background photo for your landing page hero. JPG, PNG or WebP, max 5 MB.
        </p>
        {coverPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
            <img src={coverPreview} alt="Cover preview" className="w-full h-44 object-cover" onError={() => setCoverPreview('')} />
            {uploadingCover && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCover} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs rounded-lg backdrop-blur-sm transition-colors">
                <Camera className="w-3.5 h-3.5" /> Change
              </button>
              <button onClick={handleRemoveCover} disabled={uploadingCover} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-lg backdrop-blur-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCover} className="w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#fdda36] hover:bg-[#fdda36]/5 transition-all cursor-pointer disabled:opacity-60">
            {uploadingCover ? <div className="w-7 h-7 border-2 border-[#fdda36] border-t-transparent rounded-full animate-spin" /> : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload cover image</span>
                <span className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</span>
              </>
            )}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoverUpload(file); e.target.value = ''; }} />
      </div>

      {/* Promo Video */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Play className="w-4 h-4 text-[#fdda36]" />
          Promo Video
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Paste a YouTube link — it will appear prominently on your public page next to your story.
        </p>
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
          <input
            type="url"
            value={pageData.promo_video_url}
            onChange={(e) => setPageData(d => ({ ...d, promo_video_url: e.target.value }))}
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
          />
          {pageData.promo_video_url && (
            <button onClick={() => setPageData(d => ({ ...d, promo_video_url: '' }))} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {pageData.promo_video_url && !videoId && (
          <p className="text-xs text-red-500 mt-2">Invalid YouTube URL — use youtube.com/watch?v=... or youtu.be/...</p>
        )}
        {videoId && (
          <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Video preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#fdda36]" />
          Identity
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tagline</label>
            <input
              type="text"
              value={pageData.tagline}
              onChange={(e) => setPageData({ ...pageData, tagline: e.target.value })}
              placeholder='e.g. "Chasing the podium one session at a time"'
              maxLength={120}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">{pageData.tagline.length}/120</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">My Story</label>
            <textarea
              value={pageData.bio}
              onChange={(e) => setPageData({ ...pageData, bio: e.target.value })}
              placeholder="Tell your story — your background, your journey, why you compete, what drives you..."
              rows={5}
              maxLength={1200}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none resize-none transition-all leading-relaxed"
            />
            <p className="text-xs text-gray-400 mt-1">{pageData.bio.length}/1200</p>
          </div>
        </div>
      </div>

      {/* Social links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#fdda36]" />
          Social &amp; Links
        </h3>
        <div className="space-y-3">
          {[
            { key: 'instagram', icon: Instagram, label: 'Instagram', placeholder: 'instagram.com/yourusername' },
            { key: 'youtube', icon: Youtube, label: 'YouTube', placeholder: 'youtube.com/@channel' },
            { key: 'tiktok', icon: Zap, label: 'TikTok', placeholder: 'tiktok.com/@username' },
            { key: 'other', icon: ExternalLink, label: 'Website / Other', placeholder: 'https://yourwebsite.com' },
          ].map(({ key, icon: Icon, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="text"
                value={(pageData.social_links as any)[key] || ''}
                onChange={(e) => setSocial(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] focus:border-transparent outline-none transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800/40 rounded-xl">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">Training data is auto-synced</p>
          <p className="text-xs text-blue-700 dark:text-blue-400">Your session count, monthly activity, and streak are pulled automatically from your training logs — no manual input needed.</p>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#fdda36] text-[#514163] font-bold rounded-xl hover:bg-[#ffd51a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {saved ? <><Check className="w-5 h-5" /> Saved!</> : saving ? 'Saving...' : <><Save className="w-5 h-5" /> Save Page</>}
      </button>
    </div>
  );
}
