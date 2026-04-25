import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  X,
  Check,
  CheckCheck,
  Plus,
  Search,
  Users,
  Lock,
  ChevronLeft,
  Dumbbell,
  Megaphone,
  Smile,
  Trash2,
  Info
} from 'lucide-react';

type ConvType = 'private' | 'team' | 'sport' | 'global' | 'broadcast';

interface Conversation {
  id: string;
  type: ConvType;
  name: string | null;
  sport: string | null;
  team_id: string | null;
  participant_ids: string[];
  is_read_only: boolean;
  is_muted: boolean;
  icon: string | null;
  description: string | null;
  last_message_at: string | null;
  created_by: string | null;
  other_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    sport: string | null;
  };
  unread_count?: number;
  last_message?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_expires_at: string | null;
  is_pinned: boolean;
  reply_to_id: string | null;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  is_read?: boolean;
  attachments?: LegacyAttachment[];
}

interface LegacyAttachment {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  expires_at: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  sport: string | null;
}

interface NewBroadcastForm {
  name: string;
  description: string;
  icon: string;
}

export default function ChatPage() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewBroadcast, setShowNewBroadcast] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [broadcastForm, setBroadcastForm] = useState<NewBroadcastForm>({ name: '', description: '', icon: 'Megaphone' });
  const [otherUserMembership, setOtherUserMembership] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionRef = useRef<any>(null);

  const isAdmin = profile?.role === 'admin';
  const isTrainer = profile?.role === 'trainer' || isAdmin;

  useEffect(() => {
    if (!user) return;
    loadConversations();
    loadContacts();
    ensureSportGroup();
    ensureTrainerConversation();
  }, [user, profile]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    markAsRead(selected.id);
    const unsub = subscribeToMessages(selected.id);
    if (isTrainer && selected.type === 'private' && selected.other_user) {
      loadOtherUserMembership(selected.other_user.id);
    } else {
      setOtherUserMembership(null);
    }
    return () => { unsub(); };
  }, [selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const enriched = await Promise.all((data || []).map(async (conv: any) => {
        let other_user = undefined;
        let last_message = null;

        if (conv.type === 'private') {
          const otherId = (conv.participant_ids || []).find((id: string) => id !== user.id);
          if (otherId) {
            const { data: p } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role, sport')
              .eq('id', otherId)
              .maybeSingle();
            other_user = p;
          }
        }

        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('content, attachment_type')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsg) {
          const lm = lastMsg as any;
          last_message = lm.content || (lm.attachment_type ? '📎 Archivo adjunto' : null);
        }

        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .not('sender_id', 'eq', user.id)
          .not('id', 'in', `(SELECT message_id FROM chat_message_reads WHERE user_id = '${user.id}')`);

        return {
          ...conv,
          other_user,
          last_message,
          unread_count: count || 0,
        };
      }));

      setConversations(enriched);
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!user || !profile) return;
    try {
      let query = supabase.from('profiles').select('id, full_name, avatar_url, role, sport').neq('id', user.id);

      if (profile.role === 'athlete') {
        query = query.in('role', ['trainer', 'admin', 'athlete']);
      }

      const { data } = await query.order('full_name');
      setContacts(data || []);
    } catch (e) {
      console.error('Error loading contacts:', e);
    }
  };

  const ensureSportGroup = async () => {
    const p = profile as any;
    if (!user || !p?.sport) return;
    try {
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('type', 'sport')
        .eq('sport', p.sport)
        .maybeSingle();

      if (!existing) {
        const sportName = (p.sport as string).charAt(0).toUpperCase() + (p.sport as string).slice(1);
        await supabase.from('chat_conversations').insert({
          type: 'sport',
          name: sportName,
          sport: p.sport,
          participant_ids: [user.id],
          is_read_only: false,
          created_by: user.id,
          icon: 'Dumbbell',
        } as any);
      }
    } catch (e) {
      console.error('Error ensuring sport group:', e);
    }
  };

  const loadOtherUserMembership = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('membership_access')
        .select('membership:memberships(name, slug)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const m = (data as any).membership;
        setOtherUserMembership(m?.name || null);
      } else {
        setOtherUserMembership(null);
      }
    } catch {
      setOtherUserMembership(null);
    }
  };

  const DEFAULT_COACH_EMAIL = 'agu@asciende.pro';

  const ensureTrainerConversation = async () => {
    if (!user || !profile || profile.role !== 'athlete') return;
    try {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('teams!inner(coach_id)')
        .eq('athlete_id', user.id);

      let coachIds: string[] = [];

      if (teamMemberships && teamMemberships.length > 0) {
        coachIds = [...new Set(
          teamMemberships
            .map((tm: any) => tm.teams?.coach_id)
            .filter(Boolean)
        )] as string[];
      }

      if (coachIds.length === 0) {
        const { data: defaultCoach } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', DEFAULT_COACH_EMAIL)
          .maybeSingle();

        if (defaultCoach) {
          coachIds = [(defaultCoach as any).id];
        }
      }

      for (const coachId of coachIds) {
        const { data: existing } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('type', 'private')
          .contains('participant_ids', [user.id, coachId])
          .maybeSingle();

        if (!existing) {
          await (supabase.from('chat_conversations') as any).insert({
            type: 'private',
            participant_ids: [user.id, coachId],
            created_by: user.id,
          });
        }
      }
    } catch (e) {
      console.error('Error ensuring trainer conversation:', e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url, role),
          attachments:chat_attachments(id, file_url, file_type, file_name, file_size, expires_at)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const reads = await supabase
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user!.id);

      const readIds = new Set((reads.data || []).map((r: any) => r.message_id));

      const msgs: Message[] = (data || []).map((m: any) => ({
        ...m,
        is_read: readIds.has(m.id),
      }));

      setMessages(msgs);
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const subscribeToMessages = useCallback((convId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`chat:${convId}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;

        // Only add messages from OTHER users via realtime
        // Own messages are added optimistically in sendMessage
        if (newMsg.sender_id === user!.id) {
          setConversations(prev => prev.map(c =>
            c.id === convId ? { ...c, last_message_at: newMsg.created_at } : c
          ));
          return;
        }

        const { data: senderData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', newMsg.sender_id)
          .maybeSingle();

        const { data: attachments } = await supabase
          .from('chat_attachments')
          .select('id, file_url, file_type, file_name, file_size, expires_at')
          .eq('message_id', newMsg.id);

        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, {
            ...newMsg,
            sender: senderData,
            attachments: attachments || [],
            is_read: false,
          }];
        });

        await (supabase.from('chat_message_reads') as any).upsert({
          message_id: newMsg.id,
          user_id: user!.id,
        });

        setConversations(prev => prev.map(c =>
          c.id === convId
            ? { ...c, last_message_at: newMsg.created_at, last_message: newMsg.content }
            : c
        ));
      })
      .subscribe();

    subscriptionRef.current = channel;
    return () => channel.unsubscribe();
  }, [user]);

  const markAsRead = async (convId: string) => {
    if (!user) return;
    try {
      const { data: unread } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('conversation_id', convId)
        .neq('sender_id', user.id);

      if (!unread || unread.length === 0) return;

      const reads = unread.map((m: any) => ({ message_id: m.id, user_id: user.id }));
      await (supabase.from('chat_message_reads') as any).upsert(reads, { onConflict: 'message_id,user_id' });

      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, unread_count: 0 } : c
      ));
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const sendMessage = async () => {
    if (!user || !selected || (!text.trim() && !replyTo)) return;
    if (selected.is_read_only && !isTrainer) return;

    const content = text.trim();
    setText('');
    const replyId = replyTo?.id || null;
    setReplyTo(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: selected.id,
      sender_id: user.id,
      content,
      attachment_url: null,
      attachment_type: null,
      attachment_expires_at: null,
      is_pinned: false,
      reply_to_id: replyId,
      created_at: new Date().toISOString(),
      sender: {
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || 'athlete',
      },
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data, error } = await (supabase.from('chat_messages') as any).insert({
        conversation_id: selected.id,
        sender_id: user.id,
        content,
        reply_to_id: replyId,
      }).select().single();

      if (error) throw error;

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...optimisticMsg, id: (data as any).id, created_at: (data as any).created_at } : m
      ));

      setConversations(prev => prev.map(c =>
        c.id === selected.id ? { ...c, last_message_at: (data as any).created_at, last_message: content } : c
      ));
    } catch (e) {
      console.error('Error sending message:', e);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selected) return;
    if (selected.is_read_only && !isTrainer) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(language === 'es'
        ? `Archivo demasiado grande. Máximo ${isVideo ? '100MB' : '50MB'}`
        : `File too large. Max ${isVideo ? '100MB' : '50MB'}`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data: upload, error: uploadErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(upload.path);

      const fileType = isVideo ? 'video' : isImage ? 'photo' : 'document';

      const { data: msg, error: msgErr } = await (supabase.from('chat_messages') as any).insert({
        conversation_id: selected.id,
        sender_id: user.id,
        content: null,
        attachment_url: urlData.publicUrl,
        attachment_type: fileType,
        reply_to_id: replyTo?.id || null,
      }).select().single();

      if (msgErr) throw msgErr;

      await (supabase.from('chat_attachments') as any).insert({
        message_id: (msg as any).id,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size,
      });

      setReplyTo(null);
    } catch (e) {
      console.error('Error uploading file:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startConversation = async (contact: Contact) => {
    if (!user) return;
    setShowNewChat(false);

    try {
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('type', 'private')
        .contains('participant_ids', [user.id, contact.id])
        .maybeSingle();

      if (existing) {
        const enriched = { ...(existing as any), other_user: contact } as Conversation;
        setSelected(enriched);
        setMobileShowMessages(true);
        return;
      }

      const { data: conv, error } = await (supabase.from('chat_conversations') as any).insert({
        type: 'private',
        participant_ids: [user.id, contact.id],
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      const enriched = { ...(conv as any), other_user: contact, unread_count: 0 } as Conversation;
      setConversations(prev => [enriched, ...prev]);
      setSelected(enriched);
      setMobileShowMessages(true);
    } catch (e) {
      console.error('Error starting conversation:', e);
    }
  };

  const createBroadcastChannel = async () => {
    if (!isAdmin || !user || !broadcastForm.name.trim()) return;
    try {
      const { data, error } = await (supabase.from('chat_conversations') as any).insert({
        type: 'broadcast',
        name: broadcastForm.name.trim(),
        description: broadcastForm.description.trim() || null,
        icon: broadcastForm.icon,
        is_read_only: true,
        participant_ids: [],
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      const newConv = { ...(data as any), unread_count: 0 } as Conversation;
      setConversations(prev => [newConv, ...prev]);
      setSelected(newConv);
      setMobileShowMessages(true);
      setShowNewBroadcast(false);
      setBroadcastForm({ name: '', description: '', icon: 'Megaphone' });
    } catch (e) {
      console.error('Error creating broadcast channel:', e);
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await supabase.from('chat_messages').delete().eq('id', msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      console.error('Error deleting message:', e);
    }
  };

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'private') return conv.other_user?.full_name || 'Chat';
    return conv.name || (conv.sport ? conv.sport.charAt(0).toUpperCase() + conv.sport.slice(1) : 'Grupo');
  };

  const getConvAvatar = (conv: Conversation) => {
    if (conv.type === 'private') return conv.other_user?.avatar_url;
    return null;
  };

  const getConvInitials = (conv: Conversation) => {
    const name = getConvName(conv);
    return name.slice(0, 2).toUpperCase();
  };

  const getConvBg = (conv: Conversation) => {
    if (conv.type === 'private') return 'bg-[#514163]';
    if (conv.type === 'sport') return 'bg-emerald-600';
    if (conv.type === 'team') return 'bg-blue-600';
    if (conv.type === 'broadcast' || conv.type === 'global') return 'bg-amber-600';
    return 'bg-gray-500';
  };

  const getConvIcon = (conv: Conversation) => {
    if (conv.type === 'sport') return <Dumbbell className="w-4 h-4 text-white" />;
    if (conv.type === 'team') return <Users className="w-4 h-4 text-white" />;
    if (conv.type === 'broadcast' || conv.type === 'global') return <Megaphone className="w-4 h-4 text-white" />;
    return null;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return language === 'es' ? 'Ahora' : 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return language === 'es'
      ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return d.toLocaleDateString();
  };

  const getDaysLeft = (expires: string | null) => {
    if (!expires) return null;
    const diff = new Date(expires).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const isExpired = (expires: string | null) => {
    if (!expires) return false;
    return new Date(expires) < new Date();
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canSend = selected && (!selected.is_read_only || isTrainer);

  const privateConvs = conversations.filter(c => c.type === 'private');
  const groupConvs = conversations.filter(c => c.type !== 'private' && c.type !== 'broadcast' && c.type !== 'global');
  const broadcastConvs = conversations.filter(c => c.type === 'broadcast' || c.type === 'global');

  return (
    <div
      className="flex bg-gray-50 dark:bg-gray-900 overflow-hidden"
      style={{
        /* Negative margins to escape the Layout's padding on mobile */
        marginLeft: '-1rem',
        marginRight: '-1rem',
        marginTop: '-1rem',
        marginBottom: 'calc(-10rem)',
        /* Height = viewport minus mobile header (60px) minus bottom nav (~68px) */
        height: 'calc(100svh - 60px - 68px)',
        minHeight: '300px',
      }}
    >
      {/* Left sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === 'es' ? 'Mensajes' : 'Messages'}
            </h2>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowNewBroadcast(true)}
                  className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  title={language === 'es' ? 'Canal de anuncios' : 'Broadcast channel'}
                >
                  <Megaphone className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-lg bg-[#514163] text-white hover:bg-[#6d5581] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-[#514163] border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 px-6 text-center">
              <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">
                {language === 'es' ? 'No hay conversaciones aún. Toca + para comenzar.' : 'No conversations yet. Tap + to start.'}
              </p>
            </div>
          ) : (
            <>
              {/* Private chats */}
              {privateConvs.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {language === 'es' ? 'Mensajes directos' : 'Direct messages'}
                  </div>
                  {privateConvs.map(conv => (
                    <ConvItem
                      key={conv.id}
                      conv={conv}
                      selected={selected?.id === conv.id}
                      onSelect={() => { setSelected(conv); setMobileShowMessages(true); }}
                      getName={getConvName}
                      getAvatar={getConvAvatar}
                      getInitials={getConvInitials}
                      getBg={getConvBg}
                      getIcon={getConvIcon}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}

              {/* Groups (sport + team) */}
              {groupConvs.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {language === 'es' ? 'Grupos' : 'Groups'}
                  </div>
                  {groupConvs.map(conv => (
                    <ConvItem
                      key={conv.id}
                      conv={conv}
                      selected={selected?.id === conv.id}
                      onSelect={() => { setSelected(conv); setMobileShowMessages(true); }}
                      getName={getConvName}
                      getAvatar={getConvAvatar}
                      getInitials={getConvInitials}
                      getBg={getConvBg}
                      getIcon={getConvIcon}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}

              {/* Broadcast channels */}
              {broadcastConvs.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {language === 'es' ? 'Canales' : 'Channels'}
                  </div>
                  {broadcastConvs.map(conv => (
                    <ConvItem
                      key={conv.id}
                      conv={conv}
                      selected={selected?.id === conv.id}
                      onSelect={() => { setSelected(conv); setMobileShowMessages(true); }}
                      getName={getConvName}
                      getAvatar={getConvAvatar}
                      getInitials={getConvInitials}
                      getBg={getConvBg}
                      getIcon={getConvIcon}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: message view */}
      <div className={`flex-1 flex flex-col ${!mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-6 text-center">
            <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              {language === 'es' ? 'Selecciona una conversación' : 'Select a conversation'}
            </h3>
            <p className="text-sm">
              {language === 'es'
                ? 'Elige una conversación de la lista o inicia una nueva.'
                : 'Choose a conversation from the list or start a new one.'}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3">
              <button
                className="md:hidden p-1 -ml-1 text-gray-500"
                onClick={() => { setMobileShowMessages(false); setSelected(null); }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getConvBg(selected)}`}>
                {getConvAvatar(selected) ? (
                  <img src={getConvAvatar(selected)!} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : getConvIcon(selected) ? (
                  getConvIcon(selected)
                ) : (
                  <span className="text-white text-sm font-bold">{getConvInitials(selected)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{getConvName(selected)}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selected.type === 'private' && selected.other_user?.role && (
                      <span className="capitalize">{selected.other_user.role}</span>
                    )}
                    {selected.type === 'sport' && (language === 'es' ? 'Grupo deportivo' : 'Sport group')}
                    {selected.type === 'team' && (language === 'es' ? 'Equipo' : 'Team')}
                    {(selected.type === 'broadcast' || selected.type === 'global') && (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {language === 'es' ? 'Solo lectura' : 'Read only'}
                      </span>
                    )}
                    {selected.description && ` · ${selected.description}`}
                  </p>
                  {isTrainer && selected.type === 'private' && selected.other_user?.role === 'athlete' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      otherUserMembership
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {otherUserMembership || (language === 'es' ? 'Sin membresía' : 'No membership')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
                  <Smile className="w-8 h-8 mb-2 opacity-40" />
                  {language === 'es' ? 'Sé el primero en escribir...' : 'Be the first to write...'}
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === user?.id;
                const showAvatar = !isMine && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
                const isGroup = selected.type !== 'private';

                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar for group messages */}
                    {!isMine && isGroup && (
                      <div className="w-7 h-7 flex-shrink-0 mb-1">
                        {showAvatar && (
                          msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#514163] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {(msg.sender?.full_name || '?').slice(0, 1)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className={`max-w-[70%] group relative ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender name in groups */}
                      {!isMine && isGroup && showAvatar && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                          {msg.sender?.full_name}
                        </span>
                      )}

                      {/* Reply context */}
                      {msg.reply_to_id && (
                        <div className={`text-xs px-2 py-1 mb-1 rounded-t-lg border-l-2 border-[#514163] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ${isMine ? 'self-end' : 'self-start'}`}>
                          {language === 'es' ? 'Respondiendo...' : 'Replying...'}
                        </div>
                      )}

                      <div className={`relative px-3 py-2 rounded-2xl ${
                        isMine
                          ? 'bg-[#514163] text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'
                      }`}>
                        {/* Text content */}
                        {msg.content && (
                          <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                        )}

                        {/* Inline attachment (new schema) */}
                        {msg.attachment_url && !isExpired(msg.attachment_expires_at) && (
                          <MessageAttachment
                            url={msg.attachment_url}
                            type={msg.attachment_type || 'document'}
                            daysLeft={getDaysLeft(msg.attachment_expires_at)}
                            isMine={isMine}
                          />
                        )}
                        {msg.attachment_url && isExpired(msg.attachment_expires_at) && (
                          <div className="text-xs opacity-60 italic py-1">
                            {language === 'es' ? 'Archivo expirado' : 'File expired'}
                          </div>
                        )}

                        {/* Legacy attachments */}
                        {msg.attachments && msg.attachments.map(att => (
                          !isExpired(att.expires_at) ? (
                            <MessageAttachment
                              key={att.id}
                              url={att.file_url}
                              type={att.file_type}
                              daysLeft={getDaysLeft(att.expires_at)}
                              isMine={isMine}
                              fileName={att.file_name}
                            />
                          ) : (
                            <div key={att.id} className="text-xs opacity-60 italic py-1">
                              {language === 'es' ? 'Archivo expirado' : 'File expired'}
                            </div>
                          )
                        ))}

                        {/* Timestamp + read */}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-xs ${isMine ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isMine && (
                            msg.is_read
                              ? <CheckCheck className="w-3 h-3 text-white/60" />
                              : <Check className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </div>

                      {/* Message actions */}
                      <div className={`hidden group-hover:flex items-center gap-1 mt-1 ${isMine ? 'self-end' : 'self-start'}`}>
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-0.5 rounded"
                        >
                          {language === 'es' ? 'Responder' : 'Reply'}
                        </button>
                        {isMine && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex-1 border-l-2 border-[#514163] pl-2 min-w-0">
                  <p className="text-xs font-medium text-[#514163] dark:text-[#fdda36]">
                    {replyTo.sender?.full_name || (language === 'es' ? 'Tú' : 'You')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {replyTo.content || '📎'}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input area */}
            {canSend ? (
              <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-[#514163] dark:hover:text-[#fdda36] transition-colors flex-shrink-0 mb-1"
                  >
                    {uploading
                      ? <div className="w-5 h-5 animate-spin border-2 border-[#514163] border-t-transparent rounded-full" />
                      : <Paperclip className="w-5 h-5" />
                    }
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf"
                    onChange={handleFileUpload}
                  />
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={language === 'es' ? 'Escribe un mensaje...' : 'Write a message...'}
                      rows={1}
                      className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none outline-none max-h-32"
                      style={{ minHeight: '24px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!text.trim() && !replyTo}
                    className="p-2 rounded-full bg-[#514163] text-white hover:bg-[#6d5581] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-1"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-2">
                  {language === 'es'
                    ? 'Fotos y videos se eliminan a los 10 días · Max 100MB videos, 50MB otros'
                    : 'Photos and videos are deleted after 10 days · Max 100MB videos, 50MB others'}
                </p>
              </div>
            ) : (
              <div className="px-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                <Lock className="w-4 h-4" />
                {language === 'es' ? 'Este canal es de solo lectura' : 'This channel is read-only'}
              </div>
            )}
          </>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {language === 'es' ? 'Nuevo mensaje' : 'New message'}
              </h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar persona...' : 'Search person...'}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => startConversation(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                  >
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#514163] flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{contact.full_name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{contact.full_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{contact.role}</p>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    {language === 'es' ? 'No se encontraron contactos' : 'No contacts found'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New broadcast channel modal */}
      {showNewBroadcast && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {language === 'es' ? 'Nuevo canal de anuncios' : 'New broadcast channel'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {language === 'es' ? 'Solo admins/trainers pueden publicar' : 'Only admins/trainers can post'}
                </p>
              </div>
              <button onClick={() => setShowNewBroadcast(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Nombre del canal' : 'Channel name'}
                </label>
                <input
                  type="text"
                  value={broadcastForm.name}
                  onChange={e => setBroadcastForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={language === 'es' ? 'Ej: Anuncios generales' : 'Ex: General announcements'}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                </label>
                <input
                  type="text"
                  value={broadcastForm.description}
                  onChange={e => setBroadcastForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={language === 'es' ? 'Para qué sirve este canal...' : 'What this channel is for...'}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                <Info className="w-4 h-4 flex-shrink-0" />
                {language === 'es'
                  ? 'Los atletas podrán leer pero no responder en este canal.'
                  : 'Athletes can read but cannot reply in this channel.'}
              </div>
              <button
                onClick={createBroadcastChannel}
                disabled={!broadcastForm.name.trim()}
                className="w-full py-2.5 rounded-xl bg-[#514163] text-white font-medium text-sm hover:bg-[#6d5581] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {language === 'es' ? 'Crear canal' : 'Create channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

interface ConvItemProps {
  conv: Conversation;
  selected: boolean;
  onSelect: () => void;
  getName: (c: Conversation) => string;
  getAvatar: (c: Conversation) => string | null | undefined;
  getInitials: (c: Conversation) => string;
  getBg: (c: Conversation) => string;
  getIcon: (c: Conversation) => React.ReactNode;
  formatTime: (ts: string) => string;
}

function ConvItem({ conv, selected, onSelect, getName, getAvatar, getInitials, getBg, getIcon, formatTime }: ConvItemProps) {
  const avatar = getAvatar(conv);
  const icon = getIcon(conv);

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
        selected ? 'bg-[#514163]/10 dark:bg-[#514163]/20 border-r-2 border-[#514163]' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getBg(conv)}`}>
          {avatar ? (
            <img src={avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : icon ? (
            icon
          ) : (
            <span className="text-white text-sm font-bold">{getInitials(conv)}</span>
          )}
        </div>
        {(conv.unread_count || 0) > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#514163] flex items-center justify-center">
            <span className="text-white text-xs font-bold">{conv.unread_count}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium truncate ${selected ? 'text-[#514163] dark:text-[#fdda36]' : 'text-gray-900 dark:text-white'}`}>
            {getName(conv)}
          </p>
          {conv.last_message_at && (
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
          {conv.is_read_only && <Lock className="w-3 h-3 inline mr-1" />}
          {conv.last_message || (conv.description || '')}
        </p>
      </div>
    </button>
  );
}

interface MessageAttachmentProps {
  url: string;
  type: string;
  daysLeft: number | null;
  isMine: boolean;
  fileName?: string;
}

function MessageAttachment({ url, type, daysLeft, isMine, fileName }: MessageAttachmentProps) {
  const isPhoto = type === 'photo' || type === 'image';
  const isVideo = type === 'video';
  const isDoc = type === 'document';

  return (
    <div className="mt-1">
      {isPhoto && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            className="max-w-xs max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
            alt="Imagen"
          />
        </a>
      )}
      {isVideo && (
        <video
          src={url}
          controls
          className="max-w-xs max-h-48 rounded-xl"
        />
      )}
      {isDoc && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isMine ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'} hover:opacity-80 transition-opacity`}
        >
          <FileText className={`w-4 h-4 ${isMine ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`} />
          <span className={`text-xs font-medium truncate max-w-[150px] ${isMine ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
            {fileName || 'Documento'}
          </span>
        </a>
      )}
      {(isPhoto || isVideo) && daysLeft !== null && daysLeft <= 3 && (
        <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-orange-500'}`}>
          Expira en {daysLeft}d
        </p>
      )}
    </div>
  );
}
