export interface IChatbotResponse {
    role: 'model';
    text: string;
    options?: { label: string, action: string }[];
}