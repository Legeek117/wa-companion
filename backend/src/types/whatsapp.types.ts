export interface WhatsAppSession {
  userId: string;
  sessionId: string;
  qrCode?: string;
  pairingCode?: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connectedAt?: Date;
  lastSeen?: Date;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  isGroup: boolean;
}

export interface WhatsAppStatus {
  id: string;
  contactId: string;
  contactName: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  timestamp: Date;
  viewed: boolean;
  liked: boolean;
  emojiUsed?: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  content?: string;
  mediaUrl?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  timestamp: Date;
  isViewOnce: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
}

