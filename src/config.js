// Supabase-Zugang (Publishable Key ist öffentlich, Schutz über Row Level Security)
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://mnrtjrksfgfygzmzifyy.supabase.co";
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_NyIJsWRnFEvuXhD2piEApQ_AxN1eZUG";

export const CHAT_TABLE = "coplay_chat_messages";
export const FURNITURE_TABLE = "coplay_world_furniture";
export const CHANNEL = "coplay-hub";
