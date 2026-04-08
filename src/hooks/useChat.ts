import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

export interface ChatConversation {
  user_id: string;
  user_name: string;
  last_message: string;
  last_time: string;
  unread: number;
  is_archived: boolean;
}

export function useChat() {
  const [unreadCount, setUnreadCount] = useState(0);
  const user = getNexoraUser();

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("sender", "admin")
      .eq("is_read", false);
    setUnreadCount(count || 0);
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return { unreadCount, refreshUnread: fetchUnread };
}

export function useAdminChat() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const grouped: Record<string, ChatConversation> = {};
      for (const msg of data) {
        if (!grouped[msg.user_id]) {
          grouped[msg.user_id] = {
            user_id: msg.user_id,
            user_name: msg.user_id,
            last_message: msg.content,
            last_time: msg.created_at,
            unread: 0,
            is_archived: msg.is_archived,
          };
        }
        if (msg.sender === "user" && !msg.is_read) {
          grouped[msg.user_id].unread++;
        }
      }
      setConversations(Object.values(grouped));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const sendMessage = async (userId: string, content: string) => {
    await supabase.from("chat_messages").insert({
      user_id: userId,
      content,
      sender: "admin",
      is_read: false,
    });
    fetchConversations();
  };

  const markAsRead = async (userId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("sender", "user");
    fetchConversations();
  };

  const archiveConversation = async (userId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_archived: true } as any)
      .eq("user_id", userId);
    fetchConversations();
  };

  return { conversations, loading, sendMessage, markAsRead, archiveConversation, refresh: fetchConversations };
}
