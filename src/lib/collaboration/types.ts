export interface Comment {
  id: string;
  workspace_id: string;
  entity_type: "work_item" | "knowledge_object" | "initiative";
  entity_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  mentions: string[]; // user IDs mentioned
  created_at: string;
  updated_at: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  initiativeId: string;
  lastSeen: string;
}
