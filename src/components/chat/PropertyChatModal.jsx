import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import * as chatService from '@/services/chat';
import {
  saveAttachmentBlob,
  getAttachmentBlob,
  validateAttachment,
  ALLOWED_EXTENSIONS_LABEL,
} from '@/lib/attachmentStorage';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { SmartImage } from '@/components/media/SmartImage';
import {
  X,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  CheckCheck,
  Building,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function PropertyChatModal({ isOpen, onClose, property, agent }) {
  const { user } = useAuth();
  useBodyScrollLock(isOpen);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Staged attachments before send: [{ id, file, name, size, type, previewUrl }]
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [previewMedia, setPreviewMedia] = useState(null); // { url, name, type }

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize or fetch conversation
  useEffect(() => {
    if (!isOpen || !property) return;
    let isSubscribed = true;

    setLoading(true);
    chatService
      .getOrCreateChat({ propertyId: property.id, agentId: agent?.id || property.agentId })
      .then((chatThread) => {
        if (!isSubscribed) return;
        setChat(chatThread);
        setMessages(chatThread.messages || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        toast.error(err.message || 'Failed to open conversation');
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, property, agent]);

  // Poll/listen for new messages in active thread
  useEffect(() => {
    if (!chat?.id || !isOpen) return;

    const interval = setInterval(() => {
      chatService.getChatById(chat.id).then((fresh) => {
        if (fresh && fresh.messages?.length !== messages.length) {
          setMessages(fresh.messages);
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [chat?.id, isOpen, messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAttachments]);

  if (!isOpen) return null;

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    setPendingAttachments((prev) => [
      ...prev,
      {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
      },
    ]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePending = (id) => {
    setPendingAttachments((prev) => {
      const match = prev.find((a) => a.id === id);
      if (match?.previewUrl) URL.revokeObjectURL(match.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && pendingAttachments.length === 0) return;
    if (sending || !chat?.id) return;

    setSending(true);

    try {
      // If attachments exist, simulate progressive upload and store in IndexedDB
      const uploadedMeta = [];
      if (pendingAttachments.length > 0) {
        setUploadProgress(25);
        for (let i = 0; i < pendingAttachments.length; i++) {
          const item = pendingAttachments[i];
          await saveAttachmentBlob(item.id, item.file);
          uploadedMeta.push({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
          });
          setUploadProgress(Math.round(((i + 1) / pendingAttachments.length) * 90));
        }
      }

      setUploadProgress(100);
      const newMsg = await chatService.sendMessage(chat.id, text.trim(), uploadedMeta);

      // Clean up staged previews
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setPendingAttachments([]);
      setText('');
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadAttachment = async (att) => {
    const blob = await getAttachmentBlob(att.id);
    if (!blob) {
      toast.error('Attachment data could not be retrieved.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = att.name || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleOpenPreview = async (att) => {
    const blob = await getAttachmentBlob(att.id);
    if (!blob) {
      toast.error('Preview unavailable.');
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewMedia({
      url,
      name: att.name,
      type: att.type,
    });
  };

  const closePreviewMedia = () => {
    if (previewMedia?.url) URL.revokeObjectURL(previewMedia.url);
    setPreviewMedia(null);
  };

  const isRent = property?.listingType === 'rent';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pt-20 pb-6 px-3 sm:px-4 bg-black/60 backdrop-blur-xs select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl bg-porcelain rounded-3xl shadow-2xl border border-dark-gray/20 flex flex-col h-[640px] max-h-[calc(100dvh-6rem)] overflow-hidden"
      >
        {/* 1. Modal Header */}
        <div className="p-4 sm:px-6 bg-sand/60 border-b border-dark-gray/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-deep-purple text-porcelain flex items-center justify-center font-serif text-lg font-medium shrink-0 shadow-xs">
              {agent?.name ? agent.name.charAt(0) : 'P'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base sm:text-lg text-charcoal font-medium truncate">
                  {agent?.name || 'Listing Agent'}
                </h3>
                {agent?.isVerified && (
                  <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded font-medium">
                    Verified
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-dark-gray/60 truncate flex items-center gap-1.5">
                <Building className="w-3 h-3 text-dark-gray/40 shrink-0" />
                <span>{agent?.agency || 'Porch Light Partner Agent'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-dark-gray/60 hover:text-dark-gray hover:bg-dark-gray/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple"
            aria-label="Close conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Property Context Chip */}
        <div className="p-3 px-4 sm:px-6 bg-white/70 border-b border-dark-gray/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-10 rounded-lg overflow-hidden bg-sand shrink-0 border border-dark-gray/15">
              <SmartImage
                src={property?.coverImage}
                alt={property?.title}
                aspect="listing"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-sm font-medium text-deep-purple truncate">
                {property?.title}
              </div>
              <div className="font-mono text-xs text-dark-gray/70 flex items-center gap-2">
                <span className="flex items-baseline">
                  <RupeeSymbol className="mr-0.5" />
                  <span className="font-medium text-charcoal">
                    {formatINR(property?.price, { withSymbol: false, rent: isRent })}
                  </span>
                </span>
                <span className="text-dark-gray/30">•</span>
                <span className="truncate flex items-center gap-1 text-[11px] text-dark-gray/60">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {property?.locality}, {property?.city}
                </span>
              </div>
            </div>
          </div>

          <span className="font-mono text-[10px] uppercase font-medium tracking-wider px-2 py-1 rounded bg-sand/80 text-dark-gray/70 shrink-0 hidden sm:inline-block">
            {isRent ? 'Rental Inquiry' : 'Purchase Inquiry'}
          </span>
        </div>

        {/* 3. Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="h-full flex items-center justify-center font-mono text-xs text-dark-gray/60">
              Opening secure conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-dark-gray/60 font-mono text-xs">
              <p>No messages yet. Ask a question regarding specifications, visits, or documentation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              const isSystem = msg.senderId === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="font-mono text-[11px] text-dark-gray/50 bg-black/5 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs font-sans text-sm leading-relaxed ${
                      isMe
                        ? 'bg-deep-purple text-porcelain rounded-br-xs'
                        : 'bg-white border border-dark-gray/15 text-charcoal rounded-bl-xs'
                    }`}
                  >
                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                    {/* Attachments within message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att) => {
                          const isImg = (att.type || '').startsWith('image/');

                          return (
                            <div
                              key={att.id}
                              className={`p-2 rounded-xl flex items-center justify-between gap-3 border ${
                                isMe
                                  ? 'bg-white/10 border-white/20 text-porcelain'
                                  : 'bg-sand/30 border-dark-gray/15 text-charcoal'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isImg ? (
                                  <ImageIcon className="w-4 h-4 shrink-0 text-electric-lemon" />
                                ) : (
                                  <FileText className="w-4 h-4 shrink-0 text-heather-purple" />
                                )}
                                <div className="min-w-0 text-xs font-mono">
                                  <div className="truncate font-medium">{att.name}</div>
                                  <div className="text-[10px] opacity-70">
                                    {(att.size / 1024).toFixed(0)} KB
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isImg && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(att)}
                                    className="p-1 rounded hover:bg-black/10 transition-colors"
                                    title="Preview Image"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att)}
                                  className="p-1 rounded hover:bg-black/10 transition-colors"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px] text-dark-gray/50 mt-1 px-1">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-deep-purple" />}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 4. Staged Pending Attachments Bar */}
        {pendingAttachments.length > 0 && (
          <div className="px-4 py-2 bg-sand/40 border-t border-dark-gray/10 flex flex-wrap gap-2 shrink-0">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-dark-gray/20 font-mono text-xs shadow-xs"
              >
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <FileText className="w-4 h-4 text-deep-purple" />
                )}
                <span className="truncate max-w-[140px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePending(att.id)}
                  className="text-dark-gray/50 hover:text-rose-600 transition-colors p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress bar */}
        {sending && uploadProgress > 0 && (
          <div className="h-1 bg-sand w-full shrink-0">
            <div
              className="h-full bg-deep-purple transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* 5. Message Input & Controls */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white/90 border-t border-dark-gray/15 flex items-center gap-2 shrink-0"
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleSelectFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={`Attach File (${ALLOWED_EXTENSIONS_LABEL})`}
            className="p-2.5 rounded-full text-dark-gray/70 hover:text-deep-purple hover:bg-sand/60 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message to the agent..."
            className="flex-1 bg-porcelain/60 border border-dark-gray/20 rounded-full px-4 py-2.5 text-sm text-charcoal placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all font-sans"
          />

          <button
            type="submit"
            disabled={sending || (!text.trim() && pendingAttachments.length === 0)}
            className="p-2.5 rounded-full bg-deep-purple text-porcelain hover:bg-charcoal transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple shadow-xs"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>

      {/* Attachment Image Lightbox */}
      <AnimatePresence>
        {previewMedia && (
          <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
            <button
              onClick={closePreviewMedia}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewMedia.url}
              alt={previewMedia.name}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="font-mono text-xs text-white/70 mt-3">{previewMedia.name}</div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PropertyChatModal;
