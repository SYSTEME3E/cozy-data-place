import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

interface ChatMessage {
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
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_archived: boolean;
  messages: ChatMessage[];
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
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      const grouped: Record<string, ChatConversation> = {};
      for (const msg of data as ChatMessage[]) {
        if (!grouped[msg.user_id]) {
          grouped[msg.user_id] = {
            user_id: msg.user_id,
            user_name: msg.user_id.slice(0, 8),
            user_email: "",
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
            is_archived: msg.is_archived,
            messages: [],
          };
        }
        grouped[msg.user_id].messages.push(msg);
        grouped[msg.user_id].last_message = msg.content;
        grouped[msg.user_id].last_message_at = msg.created_at;
        if (msg.sender === "user" && !msg.is_read) {
          grouped[msg.user_id].unread_count++;
        }
      }

      // Fetch user names
      const userIds = Object.keys(grouped);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("nexora_users" as any)
          .select("id, nom_prenom, email")
          .in("id", userIds);
        if (users) {
          for (const u of users as any[]) {
            if (grouped[u.id]) {
              grouped[u.id].user_name = u.nom_prenom || u.id.slice(0, 8);
              grouped[u.id].user_email = u.email || "";
            }
          }
        }
      }

      const convList = Object.values(grouped).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setConversations(convList);
      setTotalUnread(convList.reduce((sum, c) => sum + c.unread_count, 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const sendAdminReply = async (userId: string, content: string) => {
    await supabase.from("chat_messages").insert({
      user_id: userId,
      content,
      sender: "admin",
      is_read: false,
    });
    fetchConversations();
  };

  const markUserMessagesRead = async (userId: string) => {
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

  return { conversations, loading, totalUnread, sendAdminReply, markUserMessagesRead, archiveConversation, refresh: fetchConversations };
}
