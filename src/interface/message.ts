export interface ISocketMessage {
  joiningId: string;
  senderId: string;
  messageType: 'text' | 'image' | 'file';
  text?: string;
  fileUrl?: string;
}

export type LastMessageData = { 
    joiningId: string; 
    lastMessage: string | null; 
    messageType: 'text' | 'image' | 'file';
    senderId: string;
    createdAt: Date; 
};