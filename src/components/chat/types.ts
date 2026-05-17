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
};
