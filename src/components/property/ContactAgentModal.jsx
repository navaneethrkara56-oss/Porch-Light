import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLES } from '@/lib/permissions';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getOrCreateChat } from '@/services/chat';
import {
  MessageSquare,
  Phone,
  MessageCircle,
  Building,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function ContactAgentModal({
  isOpen,
  onClose,
  property,
  agent,
  onOpenChat,
  onOpenLogin,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  useBodyScrollLock(isOpen);

  if (!isOpen || !property) return null;

  const prefs = agent?.contactPreferences || {
    whatsapp: true,
    inAppChat: true,
    phoneCalls: true,
  };

  // Only offer phone if enabled in agent preferences and contact detail exists
  const agentPhone = prefs.phoneCalls !== false && agent?.phone ? agent.phone : null;

  // Strictly check for explicit whatsappNumber AND enabled in preferences; do NOT infer from phone number
  const agentWhatsApp = prefs.whatsapp !== false && agent?.whatsappNumber ? agent.whatsappNumber : null;

  // In-app messaging is always supported as the project's default workflow
  const inAppChatEnabled = prefs.inAppChat !== false || (!agentPhone && !agentWhatsApp);

  const handleMessageClick = async () => {
    if (!isAuthenticated) {
      if (onOpenLogin) onOpenLogin();
      else toast.error('Please sign in to message the agent');
      return;
    }
    if (role === ROLES.AGENT) {
      toast.error("Agent accounts cannot contact other listings.");
      return;
    }
    if (role === ROLES.ADMIN) {
      toast.error("Admin accounts use the moderation console.");
      return;
    }

    try {
      const thread = await getOrCreateChat({
        propertyId: property.id || property.customId || property._id,
        agentId: property.agentId || agent?.id || agent?.customId,
      });
      onClose();
      if (thread && thread.id) {
        navigate(`/dashboard/chat?thread=${thread.id}`);
      } else {
        navigate('/dashboard/chat');
      }
    } catch (err) {
      console.error('Failed to initiate conversation:', err);
      // Fallback: navigate to chat
      onClose();
      navigate('/dashboard/chat');
    }
  };

  const handleCallClick = () => {
    if (!agentPhone) return;
    const clean = agentPhone.replace(/\s+/g, '');
    window.location.href = `tel:${clean}`;
  };

  const handleWhatsAppClick = () => {
    if (!agentWhatsApp) return;
    const clean = agentWhatsApp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${agent?.name || 'Agent'}, I am interested in ${property.title} listed on Porch Light.`
    );
    window.open(`https://wa.me/${clean}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pt-20 pb-6 px-4 bg-black/60 backdrop-blur-xs select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-porcelain rounded-3xl shadow-2xl border border-dark-gray/20 overflow-hidden max-h-[calc(100dvh-6rem)] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-sand/60 border-b border-dark-gray/15 flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-heather-purple font-medium">
              Verified Connection
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-medium mt-0.5">
              Contact Listing Agent
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-dark-gray/60 hover:text-dark-gray hover:bg-dark-gray/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent Profile Summary */}
        <div className="p-5 sm:p-6 border-b border-dark-gray/10 flex items-center gap-4 bg-white/60">
          <div className="w-12 h-12 rounded-full bg-deep-purple text-porcelain flex items-center justify-center font-serif text-xl font-medium shrink-0 shadow-xs">
            {agent?.name ? agent.name.charAt(0) : 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif text-lg text-charcoal font-medium truncate">
                {agent?.name || 'Assigned Property Agent'}
              </h4>
              {agent?.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
            </div>
            <div className="font-mono text-xs text-dark-gray/65 flex items-center gap-1.5 truncate mt-0.5">
              <Building className="w-3 h-3 text-dark-gray/40 shrink-0" />
              <span className="truncate">{agent?.agency || 'Porch Light Exclusive Brokerage'}</span>
            </div>
          </div>
        </div>

        {/* Contact Choices */}
        <div className="p-5 sm:p-6 space-y-3 font-sans overflow-y-auto flex-1">
          <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-1 font-normal">
            Choose communication channel:
          </div>

          {/* 1. Message in Porch Light */}
          {inAppChatEnabled && (
            <button
              type="button"
              onClick={handleMessageClick}
              className="w-full p-4 rounded-2xl bg-white border border-dark-gray/20 hover:border-deep-purple hover:bg-sand/30 transition-all flex items-center justify-between group shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-deep-purple/10 text-deep-purple flex items-center justify-center shrink-0 group-hover:bg-deep-purple group-hover:text-porcelain transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif text-base font-medium text-charcoal group-hover:text-deep-purple transition-colors">
                    Message in Porch Light
                  </div>
                  <div className="font-mono text-xs text-dark-gray/65 mt-0.5">
                    Direct in-app chat with attachment support & history
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* 2. Direct Call (Only if agent has phone number) */}
          {agentPhone && (
            <button
              type="button"
              onClick={handleCallClick}
              className="w-full p-4 rounded-2xl bg-white border border-dark-gray/20 hover:border-deep-purple hover:bg-sand/30 transition-all flex items-center justify-between group shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-charcoal/10 text-charcoal flex items-center justify-center shrink-0 group-hover:bg-charcoal group-hover:text-porcelain transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif text-base font-medium text-charcoal group-hover:text-deep-purple transition-colors">
                    Call Agent
                  </div>
                  <div className="font-mono text-xs text-dark-gray/65 mt-0.5">
                    {agentPhone}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-dark-gray/40 group-hover:text-deep-purple transition-colors" />
            </button>
          )}

          {/* 3. WhatsApp (Only if agent has explicitly supplied whatsappNumber) */}
          {agentWhatsApp && (
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="w-full p-4 rounded-2xl bg-white border border-dark-gray/20 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all flex items-center justify-between group shadow-xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif text-base font-medium text-charcoal group-hover:text-emerald-800 transition-colors">
                    WhatsApp Message
                  </div>
                  <div className="font-mono text-xs text-dark-gray/65 mt-0.5">
                    Verified WhatsApp business chat
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-dark-gray/40 group-hover:text-emerald-700 transition-colors" />
            </button>
          )}

          <p className="font-mono text-[11px] text-dark-gray/50 text-center pt-2 leading-relaxed">
            External calls and WhatsApp are triggered only after your explicit selection.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default ContactAgentModal;
