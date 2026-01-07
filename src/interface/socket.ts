export interface JoinRoomPayload {
  socketId: string;
  joiningId: string;
}

interface WebRTCBasePayload {
  joiningId: string;
  fromUserId: string;
}

interface WebRTCOfferPayload extends WebRTCBasePayload {
  offer: RTCSessionDescriptionInit;
}

interface WebRTCAnswerPayload extends WebRTCBasePayload {
  answer: RTCSessionDescriptionInit;
}

interface WebRTCIceCandidatePayload extends WebRTCBasePayload {
  candidate: RTCIceCandidateInit;
}

export type WebRTCPayload = WebRTCOfferPayload | WebRTCAnswerPayload | WebRTCIceCandidatePayload | WebRTCBasePayload;
