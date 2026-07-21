import { Component, output, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatBotService } from '../../../services/chatbot/chatbot.service';

interface Message {
  text: string;
  isUser: boolean;
  time: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  closeChat = output<void>(); // phát sự kiện đóng chat  nó  tương đương với EventEmitter<void>() 
  userInput = '';
  messages = signal<Message[]>([
    { text: 'Xin chào! Tôi có thể giúp gì cho bạn?', isUser: false, time: this.getTime() }
  ]);

  constructor(private chatService: ChatBotService) {}

  ngAfterViewChecked() { this.scrollToBottom(); }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  send() {
  const text = this.userInput.trim();
  if (!text) return;

  this.messages.update(prev => [...prev, { text, isUser: true, time: this.getTime() }]);
  this.userInput = '';

  this.chatService.postMessage({ Message: text }).subscribe({
    next: (res) => {
      // ĐỔI TỪ res.reply THÀNH res.answer
      this.messages.update(prev => [...prev, { 
        text: res.answer, 
        isUser: false, 
        time: this.getTime() 
      }]);
    },
    error: (err) => {
      console.error("Chi tiết lỗi:", err);
      this.messages.update(prev => [...prev, { text: 'Lỗi kết nối server...', isUser: false, time: this.getTime() }]);
    }
  });
}
  onClose() { this.closeChat.emit(); }
}