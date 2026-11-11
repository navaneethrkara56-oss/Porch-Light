import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getChats, sendMessage } from '@/services/chat';
import {
  saveAttachmentBlob,
  getAttachmentBlob,
  validateAttachment,
  ALLOWED_EXTENSIONS_LABEL,
} from '@/lib/attachmentStorage';
import {
  MessageSquare,
  Send,
  Paperclip,
  Building2,
  ExternalLink,
  User,
  Clock,
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function UserMessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const threadParam = searchParams.get('thread') || searchParams.get('id');

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Staged attachments: [{ id, file, name, size, type, previewUrl }]
  const [pendingAttachments, setPendingAttachments] = useState([]);
  // Lightbox preview modal: { url, name, type }
  const [previewMedia, setPreviewMedia] = useState(null);

  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const loadChats = async () => {
    try {
      const data = await getChats();
      setChats(data);
      if (threadParam) {
        const match = data.find(
          (c) => c.id === threadParam || c.customId === threadParam || c._id === threadParam
        );
        if (match) {
          setSelectedChatId(match.id || match.customId || match._id);
          return;
        }
      }
      if (data.length > 0 && !selectedChatId) {
        setSelectedChatId(data[0].id || data[0].customId || data[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  const activeChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeChat?.messages, pendingAttachments]);

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    if (sending || !activeChat) return;

    setSending(true);
    try {
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

      await sendMessage(activeChat.id, inputText, uploadedMeta);
      setInputText('');
      setPendingAttachments([]);
      setUploadProgress(0);
      await loadChats();
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
        {/* Contextual Back Navigation */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Title */}
        <div className="pb-2 border-b border-charcoal/10 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60">
              Agent Communications
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-deep-purple font-medium">
              Messages
            </h1>
          </div>
          <span className="font-mono text-xs text-dark-gray/50">
            {chats.length} Active {chats.length === 1 ? 'Thread' : 'Threads'}
          </span>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : chats.length === 0 ? (
          <DashboardEmptyState
            title="No conversations yet."
            description="When you reach out to an agent from any property page, your conversation thread will appear here."
            actionLabel="Browse Residences"
            actionLink="/buy"
            icon={MessageSquare}
          />
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 rounded-2xl border border-charcoal/15 bg-porcelain overflow-hidden shadow-xs">
            {/* Conversation List Rail (Mobile toggleable) */}
            <div
              className={`${
                selectedChatId ? 'hidden md:block' : 'block'
              } border-r border-charcoal/10 bg-sand/20 overflow-y-auto`}
            >
              <div className="p-3 font-mono text-[11px] uppercase tracking-wider text-dark-gray/60 border-b border-charcoal/5">
                Property Inquiries
              </div>
              <div className="divide-y divide-charcoal/5">
                {chats.map((chat) => {
                  const isSelected = chat.id === activeChat?.id;
                  const lastMsg = chat.messages?.[chat.messages.length - 1];

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full text-left p-4 transition-colors flex flex-col gap-1 cursor-pointer ${
                        isSelected ? 'bg-sand/50 shadow-xs' : 'hover:bg-sand/35'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-base text-charcoal font-medium truncate max-w-[170px]">
                          {chat.property?.title || 'Residence Discussion'}
                        </span>
                        {lastMsg && (
                          <span className="font-mono text-[10px] text-dark-gray/50">
                            {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="font-sans text-xs text-dark-gray/60 truncate">
                        {lastMsg?.text || (lastMsg?.attachments?.length ? 'Attachment sent' : 'Thread initiated')}
                      </div>
                      <div className="font-mono text-[10px] text-deep-purple">
                        Agent Thread
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Thread Pane */}
            <div
              className={`${
                selectedChatId ? 'flex' : 'hidden md:flex'
              } col-span-2 flex flex-col h-full bg-porcelain`}
            >
              {/* Context Bar */}
              {activeChat && (
                <div className="p-3.5 border-b border-charcoal/10 bg-sand/35 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedChatId(null)}
                      className="md:hidden p-1.5 -ml-1 text-charcoal hover:bg-sand/60 rounded-lg cursor-pointer"
                      title="Back to threads"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <Building2 className="w-4 h-4 text-deep-purple shrink-0" />
                    <div>
                      <div className="font-serif text-base text-charcoal font-medium line-clamp-1">
                        {activeChat.property?.title || 'Residence Inquiries'}
                      </div>
                      <div className="font-mono text-[11px] text-dark-gray/60">
                        {activeChat.property?.locality ? `${activeChat.property.locality}, ` : ''}
                        {activeChat.property?.city || 'India'}
                      </div>
                    </div>
                  </div>
                  {activeChat.propertyId && (
                    <Link
                      to={`/property/${activeChat.propertyId}`}
                      className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-deep-purple hover:underline shrink-0"
                    >
                      <span>View Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Messages Flow */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeChat?.messages?.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const isSystem = msg.senderId === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-3">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-dark-gray/60 bg-sand/60 px-3.5 py-1 rounded-full border border-charcoal/10 inline-block max-w-sm">
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
                        className={`max-w-md rounded-2xl px-4 py-2.5 text-sm font-sans leading-relaxed ${
                          isMe
                            ? 'bg-deep-purple text-white rounded-br-none shadow-xs'
                            : 'bg-porcelain-tint text-charcoal border border-charcoal/15 rounded-bl-none shadow-xs'
                        }`}
                      >
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                        {/* Render message attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {msg.attachments.map((att) => {
                              const isImg = (att.type || '').startsWith('image/');

                              return (
                                <div
                                  key={att.id}
                                  className={`p-2 rounded-xl flex items-center justify-between gap-3 border ${
                                    isMe
                                      ? 'bg-white/10 border-white/20 text-porcelain'
                                      : 'bg-sand/40 border-charcoal/15 text-charcoal'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg ? (
                                      <ImageIcon className="w-4 h-4 shrink-0 text-lemon" />
                                    ) : (
                                      <FileText className="w-4 h-4 shrink-0 text-heather" />
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
                                        className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                                        title="Preview Image"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(att)}
                                      className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
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
                })}
              </div>

              {/* Pending Attachments Staging Bar */}
              {pendingAttachments.length > 0 && (
                <div className="p-2.5 bg-sand/40 border-t border-charcoal/10 flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 bg-porcelain-tint px-2.5 py-1.5 rounded-xl border border-charcoal/15 font-mono text-xs shadow-xs"
                    >
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt="" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-deep-purple" />
                      )}
                      <span className="truncate max-w-[140px] text-charcoal">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(att.id)}
                        className="text-dark-gray/50 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
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

              {/* Send Input Bar */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-charcoal/15 bg-sand/30 flex items-center gap-2"
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
                  className="p-2.5 rounded-xl text-dark-gray/70 hover:text-deep-purple hover:bg-sand/60 transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-charcoal/15 bg-sand/40"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message to the agent..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 text-charcoal placeholder:text-dark-gray/40 font-sans text-sm focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 min-h-[44px]"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && pendingAttachments.length === 0)}
                  className="p-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 disabled:opacity-40 transition-colors shadow-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-60 bg-black/85 flex flex-col items-center justify-center p-4">
          <button
            onClick={closePreviewMedia}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 transition-colors cursor-pointer"
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
    </DashboardLayout>
  );
}
