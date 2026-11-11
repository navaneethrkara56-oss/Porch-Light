/**
 * Chat Service for Porch Light Frontend
 * Communicates with Porch_server authoritative chat endpoints.
 */

import api from './apiClient';

export async function getChats() {
  const res = await api.get('/chat/threads');
  return res.data || [];
}

export async function getChatById(chatId) {
  const cleanId = typeof chatId === 'string' ? chatId.trim() : String(chatId || '');
  const chats = await getChats();
  return chats.find((c) => c.id === cleanId) || null;
}

export async function getOrCreateChat({ propertyId, agentId }) {
  const res = await api.post('/chat/threads/find-or-create', { propertyId, agentId });
  return res.data;
}

export async function sendMessage(chatId, text, attachments = []) {
  const cleanId = typeof chatId === 'string' ? chatId.trim() : String(chatId || '');

  // If attachment contains raw file/blob, upload to /media/upload
  const processedAttachments = await Promise.all(
    (attachments || []).map(async (att) => {
      let fileUrl = att.url || '';
      if (att.file && (att.file instanceof File || att.file instanceof Blob)) {
        try {
          const formData = new FormData();
          formData.append('file', att.file, att.name || 'attachment');
          formData.append('category', 'chat');
          const res = await api.upload('/media/upload', formData);
          fileUrl = res.data?.url || fileUrl;
        } catch (e) {
          console.warn('Chat attachment server upload failed:', e.message);
        }
      }
      return {
        id: att.id || `att_${Date.now()}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: fileUrl,
        uploadedAt: att.uploadedAt || new Date().toISOString(),
      };
    })
  );

  const res = await api.post(`/chat/${encodeURIComponent(cleanId)}/messages`, {
    text: text || '',
    attachments: processedAttachments,
  });
  return res.data;
}
