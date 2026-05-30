/** Message shape shared by direct messages and server channels. */
export type ChatUser = {
  _id: string;
  username: string;
  image: string;
};

export type ChatMessage = {
  _id: string;
  _creationTime: number;
  content: string;
  sender: ChatUser | null;
  attachment?: string | null;
  /** Set when the author changed the text after sending. */
  editedAt?: number;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
  /** The message this one answers; `deleted` is true once the original is gone. */
  replyTo?: {
    _id: string;
    deleted: boolean;
    content: string;
    senderName: string;
  } | null;
};
