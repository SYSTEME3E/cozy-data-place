import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  sender: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface ChatConversation {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  messages: ChatMessage[];
  unread_count: number;
  last_message: string;
  last_message_at: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const user = getNexoraUser();

  const loadMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) || []);
    } catch {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadMessages]);

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      content: content.trim(),
      sender: "user",
    });
    await loadMessages();
  };

  const unreadCount = messages.filter(m => m.sender === "admin" && !m.is_read).length;

  return { messages, loading, unreadCount, sendMessage, loadMessages };
}

export function useAdminChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (!msgs || msgs.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set((msgs as ChatMessage[]).map(m => m.user_id))];
      const { data: users } = await supabase
        .from("nexora_users")
        .select("id, nom_prenom, email, avatar_url")
        .in("id", userIds);

      const userMap: Record<string, any> = {};
      (users || []).forEach((u: any) => { userMap[u.id] = u; });

      const convMap: Record<string, ChatConversation> = {};
      (msgs as ChatMessage[]).forEach(m => {
        if (!convMap[m.user_id]) {
          const u = userMap[m.user_id];
          convMap[m.user_id] = {
            user_id: m.user_id,
            user_name: u?.nom_prenom || "Utilisateur",
            user_email: u?.email || "",
            user_avatar: u?.avatar_url || null,
            messages: [],
            unread_count: 0,
            last_message: "",
            last_message_at: m.created_at,
          };
        }
        convMap[m.user_id].messages.push(m);
        if (m.sender === "user" && !m.is_read) convMap[m.user_id].unread_count++;
        convMap[m.user_id].last_message = m.content;
        convMap[m.user_id].last_message_at = m.created_at;
      });

      const sorted = Object.values(convMap).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setConversations(sorted);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  const sendAdminReply = async (userId: string, content: string) => {
    if (!content.trim()) return;
    await supabase.from("chat_messages").insert({
      user_id: userId,
      content: content.trim(),
      sender: "admin",
    });
    await loadAll();
  };

  const markUserMessagesRead = async (userId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_read: true } as any)
      .eq("user_id", userId)
      .eq("sender", "user")
      .eq("is_read", false);
    await loadAll();
  };

  const archiveConversation = async (userId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_archived: true } as any)
      .eq("user_id", userId);
    await loadAll();
  };

  return { conversations, loading, totalUnread, sendAdminReply, markUserMessagesRead, archiveConversation };
}
