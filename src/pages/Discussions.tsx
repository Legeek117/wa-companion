import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Search,
  X,
  Bell,
  BellOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Mail,
  MailOpen,
  Send,
  SquarePen,
  CheckCheck,
  Image as ImageIcon,
  Video,
  AudioLines,
  FileText,
  Sticker,
  Mic,
  MoreVertical,
  Inbox,
} from "lucide-react";

interface ConversationMessage {
  message_id: string;
  from_me: boolean;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  timestamp: string;
}

interface Conversation {
  contact_id: string;
  contact_name: string;
  message_count: number;
  last_message: ConversationMessage;
}

interface ChatMessage {
  id: string;
  message_id: string;
  from_me: boolean;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  timestamp: string;
}

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-600",
  "bg-indigo-500",
  "bg-orange-500",
];

const getInitials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const MEDIA_LABELS: Record<string, string> = {
  image: "📷 Photo",
  video: "🎥 Vidéo",
  audio: "🎵 Audio",
  document: "📄 Document",
  sticker: "⏺ Sticker",
};

const API_URL = (import.meta.env.VITE_API_URL || 'https://wa-companion.onrender.com').replace(/[\/\.]+$/, '');

const buildMediaUrl = (mediaUrl: string | null | undefined): string | null => {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  return `${API_URL}${mediaUrl}`;
};

const previewText = (m: ConversationMessage) => {
  if (m.content && m.content !== "EMPTY") return m.content;
  if (m.media_type && m.media_type !== "text") return `${m.from_me ? "🔒 " : ""}${MEDIA_LABELS[m.media_type] || "📎 Pièce jointe"}`;
  return "(message vide)";
};

const whatsAppTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Hier";
  if (now.getTime() - d.getTime() < 7 * 86400000)
    return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const formatDayHeader = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  if (isSameDay(d, now)) return "Aujourd'hui";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (isSameDay(d, y)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
};

const useLongPress = (onLongPress: () => void, ms = 450) => {
  const timer = useRef<number | null>(null);
  const started = useRef(false);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    started.current = false;
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    timer.current = window.setTimeout(() => {
      started.current = false;
      onLongPress();
    }, ms);
  };

  useEffect(() => () => clear(), []);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      clear();
      onLongPress();
    },
  };
};

function useLocalList(key: string) {
  const load = (): string[] => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };
  const [list, setList] = useState<string[]>(load);
  const update = (next: string[]) => {
    setList(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const toggle = (id: string) => update(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const add = (id: string) => update(list.includes(id) ? list : [...list, id]);
  const remove = (id: string) => update(list.filter((x) => x !== id));
  return { list, toggle, add, remove };
}

function useReadState() {
  const [read, setRead] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("amda:readState") || "{}");
    } catch {
      return {};
    }
  });
  const persist = (next: Record<string, number>) => {
    setRead(next);
    try {
      localStorage.setItem("amda:readState", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const markRead = (id: string) => persist({ ...read, [id]: Date.now() });
  const removeRead = (id: string) => {
    const next = { ...read };
    delete next[id];
    persist(next);
  };
  return { read, markRead, removeRead };
}

const AvatarBubble = ({ name }: { name: string }) => (
  <div
    className={cn(
      "w-full h-full flex items-center justify-center text-white font-semibold",
      avatarColor(name)
    )}
  >
    {getInitials(name)}
  </div>
);

const profilePicCache = new Map<string, string | null>();

const fetchProfilePic = async (contactId: string): Promise<string | null> => {
  if (profilePicCache.has(contactId)) return profilePicCache.get(contactId) ?? null;
  try {
    const response = await api.messages.profilePicture(contactId);
    const data = response.data as { profile_pic_url?: string | null } | undefined;
    const url = response.success && data?.profile_pic_url ? data.profile_pic_url : null;
    profilePicCache.set(contactId, url);
    return url;
  } catch {
    profilePicCache.set(contactId, null);
    return null;
  }
};

const ContactAvatar = ({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) => (
  <Avatar className={cn("rounded-full overflow-hidden", className)}>
    {photoUrl ? (
      <AvatarImage src={photoUrl} alt={name} className="object-cover w-full h-full" />
    ) : (
      <AvatarFallback className="p-0">
        <AvatarBubble name={name} />
      </AvatarFallback>
    )}
  </Avatar>
);

export default function Discussions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [peek, setPeek] = useState<Conversation | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { list: muted, toggle: toggleMuted } = useLocalList("amda:muted");
  const { list: archivedList, toggle: toggleArchived, remove: unarchive } = useLocalList("amda:archived");
  const { list: hidden, add: hideConv } = useLocalList("amda:hiddenDiscussions");
  const { read, markRead, removeRead } = useReadState();
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(
      new Set(conversations.map((c) => c.contact_id).filter((id) => !(id in photos)))
    );
    if (ids.length === 0) return;
    (async () => {
      for (const id of ids) {
        if (cancelled) return;
        const url = await fetchProfilePic(id).catch(() => null);
        if (cancelled) return;
        setPhotos((prev) => (prev[id] === url ? prev : { ...prev, [id]: url }));
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversations]);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["discussions", "conversations"],
    queryFn: async () => {
      const response = await api.messages.conversations(200);
      if (response.success && response.data) return response.data as Conversation[];
      return [];
    },
    refetchInterval: 15 * 1000,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });

  const visible = conversations.filter((c) => !hidden.includes(c.contact_id));
  const archived = visible.filter((c) => archivedList.includes(c.contact_id));
  const active = visible.filter((c) => !archivedList.includes(c.contact_id));

  const isConversationUnread = (c: Conversation) => {
    const ts = new Date(c.last_message.timestamp).getTime();
    return ts > (read[c.contact_id] || 0);
  };

  const results = (convos: Conversation[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter(
      (c) =>
        c.contact_name.toLowerCase().includes(q) ||
        previewText(c.last_message).toLowerCase().includes(q)
    );
  };

  const openChat = (c: Conversation) => {
    setSelected(c);
    markRead(c.contact_id);
  };

  const handlePeekAction = (action: "unread" | "read" | "mute" | "archive" | "delete") => {
    if (!peek) return;
    const c = peek;
    setPeek(null);
    switch (action) {
      case "unread":
        removeRead(c.contact_id);
        toast.info(`${c.contact_name} marqué non lu`);
        break;
      case "read":
        markRead(c.contact_id);
        break;
      case "mute":
        toggleMuted(c.contact_id);
        toast.info(muted.includes(c.contact_id) ? "Son activé" : "Conversation muette");
        break;
      case "archive":
        toggleArchived(c.contact_id);
        break;
      case "delete":
        hideConv(c.contact_id);
        toast.info("Discussion supprimée");
        break;
    }
  };

  const unreadTotal = active.filter(isConversationUnread).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 animate-pulse mx-auto" />
          <p className="text-muted-foreground text-sm">Chargement des discussions…</p>
        </div>
      </div>
    );
  }

  const listSection = (label: string, convos: Conversation[], showUnreadOnly = false) => {
    const items = results(convos).filter((c) => (showUnreadOnly ? isConversationUnread(c) : true));
    if (items.length === 0 && !showUnreadOnly) {
      if (label === "Archivées" && !archived.length) return null;
      if (label === "Archivées") return null;
      return (
        <div className="py-10 text-center">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Aucune discussion pour le moment</p>
        </div>
      );
    }
    if (items.length === 0) return null;
    return (
      <div>
        {label && (
          <div className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {label}
          </div>
        )}
        {items.map((c) => (
          <ConversationRow
            key={c.contact_id}
            conv={c}
            photoUrl={photos[c.contact_id] ?? null}
            unread={isConversationUnread(c)}
            muted={muted.includes(c.contact_id)}
            archived={archivedList.includes(c.contact_id)}
            onClick={() => openChat(c)}
            onPeek={() => setPeek(c)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="ios-fade-in mx-[-12px] sm:mx-[-16px] md:mx-[-24px] mt-[-12px] sm:mt-[-16px] md:mt-[-24px] h-[calc(100dvh-80px)] md:h-[calc(100dvh-64px)] flex rounded-b-[1.75rem] md:rounded-none overflow-hidden border border-border/60 shadow-glass">
      {/* LEFT PANE */}
      <div
        className={cn(
          "flex flex-col bg-white dark:bg-[#0b141a]",
          !selected ? "flex-1 md:flex-none" : "hidden md:flex",
          "md:w-[380px] md:border-r md:border-border/70",
          "overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 bg-white/90 dark:bg-[#0b141a]/90 backdrop-blur-xl sticky top-0 z-10">
          <h1 className="text-xl font-bold tracking-tight flex-1">Discussions</h1>
          {unreadTotal > 0 && (
            <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
              {unreadTotal}
            </span>
          )}
          <button
            onClick={() => setNewChatOpen(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Nouvelle discussion"
          >
            <SquarePen className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Archives"
          >
            <Archive className="w-5 h-5 text-primary" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Plus">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-muted/70 dark:bg-white/10 rounded-full px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-10">
          {active.length === 0 && archived.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircleOutline />
              </div>
              <p className="font-semibold mb-1">Aucune discussion</p>
              <p className="text-sm text-muted-foreground">
                Les conversations WhatsApp capturées par AMDA apparaîtront ici.
              </p>
            </div>
          ) : (
            listSection("", active, false)
          )}
          {!search && archived.length > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              <Archive className="w-5 h-5" />
              <span className="font-medium">Archivées</span>
              <span className="ml-auto text-xs">{archived.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT PANE / CHAT */}
      <div className={cn("flex-1 bg-[#efeae2] dark:bg-[#0b141a]", !selected && "hidden md:flex")}>
        {selected ? (
          <ChatPane
            conversation={selected}
            photoUrl={photos[selected.contact_id] ?? null}
            onBack={() => setSelected(null)}
            onArchive={() => {
              toggleArchived(selected.contact_id);
              toast.info("Discussion archivée");
              setSelected(null);
            }}
            onUnread={() => {
              removeRead(selected.contact_id);
              toast.info("Marqué non lu");
              setSelected(null);
            }}
            onDelete={() => {
              hideConv(selected.contact_id);
              toast.info("Discussion supprimée");
              setSelected(null);
            }}
            onMute={() => {
              toggleMuted(selected.contact_id);
            }}
            muted={muted.includes(selected.contact_id)}
            onRead={() => markRead(selected.contact_id)}
            onRefresh={() =>
              queryClient.invalidateQueries({ queryKey: ["discussions", "messages", selected.contact_id] })
            }
          />
        ) : (
          <EmptyChatPane />
        )}
      </div>

      {/* PEEK & POP OVERLAY */}
      {peek && (
        <PeekOverlay
          conversation={peek}
          photoUrl={photos[peek.contact_id] ?? null}
          muted={muted.includes(peek.contact_id)}
          unread={isConversationUnread(peek)}
          onClose={() => setPeek(null)}
          onAction={(a) => handlePeekAction(a)}
        />
      )}

      {/* ARCHIVED SHEET */}
      {showArchived && (
        <div
          className="fixed inset-0 z-50 md:inset-y-0 md:left-[380px] md:right-0 bg-white dark:bg-[#0b141a] flex flex-col"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
            <button onClick={() => setShowArchived(false)} className="p-2 rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg flex-1">Archivées</h2>
            <button
              onClick={() => {
                archived.forEach((c) => unarchive(c.contact_id));
                setShowArchived(false);
                toast.info("Toutes les discussions restaurées");
              }}
              className="text-sm text-primary font-medium px-2"
            >
              Tout restaurer
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {archived.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                Aucune discussion archivée
              </div>
            ) : (
              archived.map((c) => (
                <ConversationRow
                  key={c.contact_id}
                  conv={c}
                  unread={isConversationUnread(c)}
                  muted={muted.includes(c.contact_id)}
                  archived
                  onClick={() => {
                    unarchive(c.contact_id);
                    openChat(c);
                    setShowArchived(false);
                  }}
                  onPeek={() => setPeek(c)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* NEW CHAT MODAL */}
      {newChatOpen && (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          conversations={active}
          onOpenExisting={(c) => {
            setNewChatOpen(false);
            openChat(c);
          }}
          onSent={(to, name) => {
            setNewChatOpen(false);
            queryClient.invalidateQueries({ queryKey: ["discussions", "conversations"] });
            const existing = conversations.find((c) => c.contact_id === to);
            if (existing) {
              openChat(existing);
            } else {
              setSelected({
                contact_id: to,
                contact_name: name,
                message_count: 0,
                last_message: { message_id: "", from_me: false, content: "", media_type: null, media_url: null, timestamp: new Date().toISOString() },
              });
              markRead(to);
            }
          }}
        />
      )}
    </div>
  );
}

function MessageCircleOutline() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/50">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

interface ConversationRowProps {
  conv: Conversation;
  photoUrl?: string | null;
  unread: boolean;
  muted: boolean;
  archived?: boolean;
  onClick: () => void;
  onPeek: () => void;
}

function ConversationRow({ conv, photoUrl, unread, muted, archived, onClick, onPeek }: ConversationRowProps) {
  const longPress = useLongPress(onPeek);
  const last = conv.last_message;
  const preview = previewText(last);

  return (
    <div
      {...longPress}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors",
        "-webkit-touch-callout: none touch-callout:none",
        unread ? "bg-[#f0f2f5] dark:bg-white/5" : "hover:bg-muted/60 dark:hover:bg-white/5",
        archived && "opacity-80"
      )}
    >
      <div className="relative flex-shrink-0">
        <ContactAvatar name={conv.contact_name} photoUrl={photoUrl} className="w-12 h-12" />
        {archived && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#222e35] border border-border/40 flex items-center justify-center shadow-sm">
            <ArchiveRestore className="w-3 h-3 text-muted-foreground" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 border-b border-border/50 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("flex-1 truncate text-[15px]", unread ? "font-bold" : "font-medium")}>
            {conv.contact_name}
          </span>
          {muted && <BellOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
          <span
            className={cn(
              "text-xs flex-shrink-0",
              unread ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            {whatsAppTime(last.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              "flex-1 truncate text-[13.5px]",
              unread ? "font-semibold text-foreground/90" : "text-muted-foreground"
            )}
          >
            {last.from_me && (
              <span className="inline-flex items-center mr-1 align-middle">
                <CheckCheck className={cn("w-4 h-4", unread ? "text-primary" : "text-muted-foreground/70")} />
              </span>
            )}
            {previewText(last)}
          </span>
          {unread && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
              ●
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChatPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 h-full">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <MessageCircleOutline />
      </div>
      <h3 className="text-xl font-semibold mb-2">Discussions AMDA</h3>
      <p className="text-muted-foreground max-w-md">
        Sélectionnez une discussion pour consulter les messages capturés par votre bot WhatsApp.
      </p>
    </div>
  );
}

function ChatPane({
  conversation,
  photoUrl,
  onBack,
  onArchive,
  onUnread,
  onDelete,
  onMute,
  muted,
  onRead,
  onRefresh,
}: {
  conversation: Conversation;
  photoUrl?: string | null;
  onBack: () => void;
  onArchive: () => void;
  onUnread: () => void;
  onDelete: () => void;
  onMute: () => void;
  muted: boolean;
  onRead: () => void;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["discussions", "messages", conversation.contact_id],
    queryFn: async () => {
      const response = await api.messages.conversationMessages(conversation.contact_id, 500);
      if (response.success && response.data) return response.data as ChatMessage[];
      return [];
    },
    enabled: !!conversation.contact_id,
    refetchInterval: 10 * 1000,
    staleTime: 3 * 1000,
  });

  useEffect(() => {
    onRead();
    scrollToBottom();
  }, [conversation.contact_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const response = await api.messages.send(conversation.contact_id, text.trim());
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["discussions", "messages", conversation.contact_id] });
        queryClient.invalidateQueries({ queryKey: ["discussions", "conversations"] });
        setText("");
        setTimeout(scrollToBottom, 150);
      } else {
        toast.error(response.error?.message || "Erreur lors de l'envoi");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border/60 bg-[#f0f2f5] dark:bg-[#0b141a] dark:border-white/10">
        <button onClick={onBack} className="md:hidden p-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ContactAvatar name={conversation.contact_name} photoUrl={photoUrl} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] truncate">{conversation.contact_name}</p>
          <p className="text-xs text-muted-foreground">
            {conversation.message_count} message{conversation.message_count > 1 ? "s" : ""}
            {muted && " • muet"}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onRefresh}
            className="p-2 rounded-full hover:bg-muted text-primary"
            aria-label="Actualiser"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          <button onClick={onMute} className="p-2 rounded-full hover:bg-muted" aria-label="Muer">
            {muted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </button>
          <button onClick={onArchive} className="p-2 rounded-full hover:bg-muted" aria-label="Archiver">
            <Archive className="w-5 h-5" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-full hover:bg-muted text-destructive" aria-label="Supprimer">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(37,211,102,0.05) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(37,211,102,0.05) 0, transparent 40%)",
        }}
      >
        {messagesLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-6 text-sm text-muted-foreground">
            Aucun message dans cette discussion pour le moment.
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDay = !prev || !isSameDay(new Date(m.timestamp), new Date(prev.timestamp));
            const grouped =
              prev &&
              prev.from_me === m.from_me &&
              new Date(m.timestamp).getTime() - new Date(prev.timestamp).getTime() < 5 * 60 * 1000;
            return (
              <div key={m.id} className="space-y-1.5">
                {showDay && (
                  <div className="flex justify-center pt-2">
                    <span className="text-[11px] font-medium text-[#54656f] dark:text-muted-foreground bg-white dark:bg-white/10 px-2.5 py-1 rounded-lg shadow-sm">
                      {formatDayHeader(m.timestamp)}
                    </span>
                  </div>
                )}
                <MessageBubble msg={m} grouped={grouped} />
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 px-2 py-2 border-t border-border/60 bg-[#f0f2f5] dark:bg-[#0b141a] dark:border-white/10">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message"
          rows={1}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-white dark:bg-white/10 rounded-full px-4 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
        />
        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            aria-label="Envoyer"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11 rounded-full bg-white dark:bg-white/10 text-primary flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, grouped }: { msg: ChatMessage; grouped: boolean }) {
  const content = msg.content && msg.content !== "EMPTY" ? msg.content : null;
  const mediaUrl = buildMediaUrl(msg.media_url);

  return (
    <div className={cn("flex", msg.from_me ? "justify-end" : "justify-start", grouped ? "mt-[2px]" : "mt-2")}>
      <div
        className={cn(
          "max-w-[82%] px-2.5 py-1.5 shadow-sm relative",
          msg.from_me
            ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-2xl rounded-br-md"
            : "bg-white dark:bg-[#202c33] rounded-2xl rounded-bl-md",
          grouped && (msg.from_me ? "rounded-br-2xl" : "rounded-bl-2xl")
        )}
      >
        {mediaUrl && msg.media_type === "image" && (
          <img
            src={mediaUrl}
            alt={content || MEDIA_LABELS.image}
            className="rounded-xl max-h-80 w-full object-cover"
            loading="lazy"
          />
        )}
        {mediaUrl && msg.media_type === "video" && (
          <video src={mediaUrl} controls className="rounded-xl max-h-80 w-full" />
        )}
        {mediaUrl && msg.media_type === "audio" && (
          <audio src={mediaUrl} controls className="w-full max-w-[260px]" />
        )}
        {!mediaUrl && msg.media_type && msg.media_type !== "text" && !content && (
          <div className="flex items-center gap-2 py-1 text-sm font-medium">
            {msg.media_type === "image" && <ImageIcon className="w-5 h-5" />}
            {msg.media_type === "video" && <Video className="w-5 h-5" />}
            {msg.media_type === "audio" && <AudioLines className="w-5 h-5" />}
            {msg.media_type === "document" && <FileText className="w-5 h-5" />}
            {msg.media_type === "sticker" && <Sticker className="w-5 h-5" />}
            <span>{MEDIA_LABELS[msg.media_type] || "Pièce jointe"}</span>
          </div>
        )}
        {content && <p className="text-[14.5px] leading-snug whitespace-pre-wrap break-words">{content}</p>}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10.5px] text-[#667781] dark:text-[#ffffff99] leading-none">
            {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {msg.from_me && (
            <span className="text-primary/90 inline-flex items-center">
              <CheckCheck className="w-4 h-4 -mr-1.5 relative -top-px" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PeekOverlay({
  conversation,
  photoUrl,
  muted,
  unread,
  onClose,
  onAction,
}: {
  conversation: Conversation;
  photoUrl?: string | null;
  muted: boolean;
  unread: boolean;
  onClose: () => void;
  onAction: (a: "unread" | "read" | "mute" | "archive" | "delete") => void;
}) {
  const { data: messages = [] } = useQuery({
    queryKey: ["discussions", "peek", conversation.contact_id],
    queryFn: async () => {
      const response = await api.messages.conversationMessages(conversation.contact_id, 10);
      if (response.success && response.data) return response.data as ChatMessage[];
      return [];
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const peekMsgs = messages.slice(-8).reverse();

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xl transition-opacity" />
      {/* Preview card (top) */}
      <div
        className="absolute top-[8%] left-0 right-0 mx-auto max-w-lg bg-white dark:bg-[#111b21] rounded-[1.75rem] shadow-2xl border border-border/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <ContactAvatar name={conversation.contact_name} photoUrl={photoUrl} className="w-11 h-11" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] truncate">{conversation.contact_name}</p>
            <p className="text-xs text-muted-foreground">
              {unread ? "Non lu" : "Déjà lu"} • {conversation.message_count} message{conversation.message_count > 1 ? "s" : ""}
            </p>
          </div>
          {muted && <BellOff className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="max-h-[46vh] overflow-y-auto px-3 py-3 bg-[#efeae2] dark:bg-[#0b141a]">
          {peekMsgs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Aucun message enregistré</p>
          ) : (
            peekMsgs.map((m) => <MessageBubble key={m.id} msg={m} grouped={false} />)
          )}
        </div>
      </div>

      {/* Action sheet (bottom) */}
      <div
        className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-[1.75rem] bg-white dark:bg-[#1c272e] border-t border-border/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border my-2.5" />
        <div className="px-1 pb-3">
          <ActionSheetRow
            icon={unread ? <Mail className="w-5 h-5 text-primary" /> : <MailOpen className="w-5 h-5 text-primary" />}
            label={unread ? "Marquer comme lu" : "Marquer comme non lu"}
            onClick={() => onAction(unread ? "read" : "unread")}
          />
          <ActionSheetRow
            icon={<Bell className="w-5 h-5 text-primary" />}
            label={muted ? "Activer les notifications" : "Mettre en sourdine"}
            onClick={() => onAction("mute")}
          />
          <ActionSheetRow
            icon={<Archive className="w-5 h-5 text-primary" />}
            label="Archiver la discussion"
            onClick={() => onAction("archive")}
          />
          <ActionSheetRow
            icon={<Trash2 className="w-5 h-5 text-destructive" />}
            label="Supprimer la discussion"
            danger
            onClick={() => onAction("delete")}
          />
        </div>
      </div>
    </div>
  );
}

function ActionSheetRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl hover:bg-muted/70 dark:hover:bg-white/5 transition-colors text-left"
    >
      {icon}
      <span className={cn("text-[15px] font-medium", danger && "text-destructive")}>{label}</span>
    </button>
  );
}

function NewChatModal({
  onClose,
  conversations,
  onOpenExisting,
  onSent,
}: {
  onClose: () => void;
  conversations: Conversation[];
  onOpenExisting: (c: Conversation) => void;
  onSent: (to: string, name: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");

  const existing = conversations.filter((c) =>
    c.contact_name.toLowerCase().includes(number.trim().toLowerCase()) ||
    c.contact_id.split("@")[0].includes(number.replace(/\D/g, ""))
  );

  const handleSend = async () => {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 8 || !message.trim() || sending) return;
    setSending(true);
    try {
      const to = `${digits}@s.whatsapp.net`;
      const response = await api.messages.send(to, message.trim());
      if (response.success) {
        toast.success("Message envoyé");
        onSent(to, digits);
      } else {
        toast.error(response.error?.message || "Erreur lors de l'envoi");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#111b21] rounded-[1.5rem] shadow-2xl border border-border/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg">Nouvelle discussion</h3>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setMode("existing")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors border",
              mode === "existing" ? "bg-primary text-primary-foreground border-primary" : "border-border"
            )}
          >
            Contacts
          </button>
          <button
            onClick={() => setMode("new")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors border",
              mode === "new" ? "bg-primary text-primary-foreground border-primary" : "border-border"
            )}
          >
            Nouveau numéro
          </button>
        </div>

        {mode === "existing" && (
          <div className="max-h-[45vh] overflow-y-auto py-2">
            {existing.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Recherchez un contact par son nom ou son numéro.
              </p>
            ) : (
              existing.map((c) => (
                <button
                  key={c.contact_id}
                  onClick={() => {
                    onOpenExisting(c);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/70 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <AvatarFallback className="p-0">
                      <AvatarBubble name={c.contact_name} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.contact_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{previewText(c.last_message)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {mode === "new" && (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Numéro de téléphone (avec indicatif, ex: 229 01 02 03 04)
              </label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+229..."
                inputMode="tel"
                className="w-full rounded-xl bg-muted/60 dark:bg-white/5 px-4 py-2.5 text-[15px] outline-none focus:ring-1 focus:ring-primary/40 border border-border/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message…"
                rows={3}
                className="w-full rounded-xl bg-muted/60 dark:bg-white/5 px-4 py-2.5 text-[15px] outline-none focus:ring-1 focus:ring-primary/40 border border-border/50 resize-none"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={number.replace(/\D/g, "").length < 8 || !message.trim() || sending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}