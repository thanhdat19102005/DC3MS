import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as signalR from '@microsoft/signalr';

import { environment } from '../../../../environments/environment.development';
import { VideoCallService } from '../../../../services/video-call/video-call.service';

@Component({
  selector: 'app-rescue-team-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rescue-team-chat.component.html',
  styleUrl: './rescue-team-chat.component.css'
})
export class RescueTeamChatComponent implements OnInit, OnDestroy {
  @Input() selectedRequest: any = null;
  @Input() teamId = '';
  @Input() teamName = 'Đội cứu hộ';

  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  messageText = '';
  isConnected = false;
  messages: any[] = [];

  isVideoCallOpen = false;
  isIncomingVideoCall = false;
  callStatusText = 'Đang gọi video...';

  private hubConnection!: signalR.HubConnection;
  private localStream: MediaStream | null = null;
  private incomingOffer: RTCSessionDescriptionInit | null = null;
  private hasListeningVideoEvents = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private videoCallService: VideoCallService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
    this.startSignalR();
    this.startVideoSignalRForIncomingCall();
  }

  private loadHistory(): void {
    const phoneNumber = this.selectedRequest?.phone;

    if (!phoneNumber) return console.warn('Thiếu số điện thoại người dân để load lịch sử.');
    if (!this.teamId) return console.warn('Thiếu teamId để load lịch sử.');

    const url =
      `${environment.apiUrl}/api/RescueChat/history` +
      `?phoneNumber=${encodeURIComponent(phoneNumber)}` +
      `&teamId=${encodeURIComponent(this.teamId)}`;

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Không load được lịch sử chat.');
        return res.json();
      })
      .then((data: any[]) => {
        this.messages = data.map((x: any) => ({
          sender: x.senderType,
          senderName: x.senderName,
          text: x.message,
          time: new Date(x.sentAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }));

        this.cdr.detectChanges();
      })
      .catch(err => console.error('Lỗi load lịch sử chat:', err));
  }

  private startSignalR(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/rescueChatHub`, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveRescueMessage', (data: any) => {
      this.messages.push({
        sender: data.senderType,
        senderName: data.senderName,
        text: data.message,
        time: new Date(data.sentAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      this.cdr.detectChanges();
    });

    this.hubConnection
      .start()
      .then(() => {
        this.isConnected = true;
        return this.joinRoom();
      })
      .catch(err => {
        this.isConnected = false;
        console.error('Lỗi SignalR đội cứu hộ:', err);
      });
  }

  private joinRoom(): Promise<void> {
    const phoneNumber = this.selectedRequest?.phone;

    if (!phoneNumber) {
      console.warn('Thiếu số điện thoại người dân.');
      return Promise.resolve();
    }

    if (!this.teamId) {
      console.warn('Thiếu teamId.');
      return Promise.resolve();
    }

    return this.hubConnection.invoke(
      'JoinRescueRoomForTeam',
      phoneNumber,
      this.teamId
    );
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    const phoneNumber = this.selectedRequest?.phone;

    if (!text) return;
    if (!phoneNumber) return console.warn('Thiếu số điện thoại người dân.');
    if (!this.teamId) return console.warn('Thiếu teamId.');
    if (!this.isConnected) return console.warn('SignalR chưa kết nối.');

    this.hubConnection
      .invoke(
        'SendRescueMessageForTeam',
        phoneNumber,
        this.teamId,
        this.teamName,
        text
      )
      .then(() => {
        this.messageText = '';
        this.cdr.detectChanges();
      })
      .catch(err => console.error('Lỗi gửi tin nhắn đội cứu hộ:', err));
  }

  close(): void {
    this.closeChat.emit();
  }

  private async startVideoSignalRForIncomingCall(): Promise<void> {
    const phoneNumber = this.selectedRequest?.phone;

    if (!phoneNumber || !this.teamId) {
      console.warn('Thiếu phoneNumber hoặc teamId để join video room.');
      return;
    }

    try {
      await this.videoCallService.startConnection();

      this.videoCallService.roomId =
        await this.videoCallService.joinRoomForTeam(
          phoneNumber,
          this.teamId
        );

      console.log('TEAM JOIN VIDEO ROOM:', this.videoCallService.roomId);

      this.listenVideoEvents();
    } catch (err) {
      console.error('Lỗi join video room:', err);
    }
  }

  async openVideoCall(): Promise<void> {
    const phoneNumber = this.selectedRequest?.phone;

    if (!phoneNumber || !this.teamId) {
      alert('Thiếu số điện thoại hoặc teamId.');
      return;
    }

    this.isVideoCallOpen = true;
    this.isIncomingVideoCall = false;
    this.callStatusText = 'Đang mở camera...';

    setTimeout(async () => {
      try {
        await this.videoCallService.startConnection();

        if (!this.videoCallService.roomId) {
          this.videoCallService.roomId =
            await this.videoCallService.joinRoomForTeam(
              phoneNumber,
              this.teamId
            );
        }

        console.log('ROOM ID:', this.videoCallService.roomId);

        this.videoCallService.createPeerConnection();

        await this.openLocalCamera();
        this.setupPeerConnectionEvents();

        const offer =
          await this.videoCallService.peerConnection.createOffer();

        await this.videoCallService.peerConnection.setLocalDescription(offer);

        await this.videoCallService.sendOffer(
          this.videoCallService.roomId,
          offer
        );

        this.callStatusText = 'Đang gọi video...';
        this.cdr.detectChanges();
      } catch (err) {
        console.error('Lỗi mở video call:', err);
        this.callStatusText = 'Không thể mở cuộc gọi.';
        this.cdr.detectChanges();
      }
    }, 100);
  }

  acceptIncomingVideoCall(): void {
    if (!this.incomingOffer) {
      console.warn('Không có offer để nhận cuộc gọi.');
      return;
    }

    this.isIncomingVideoCall = false;
    this.isVideoCallOpen = true;
    this.callStatusText = 'Đang kết nối cuộc gọi...';

    setTimeout(async () => {
      try {
        this.videoCallService.createPeerConnection();

        await this.openLocalCamera();
        this.setupPeerConnectionEvents();

        await this.videoCallService.peerConnection.setRemoteDescription(
          new RTCSessionDescription(this.incomingOffer!)
        );

        const answer =
          await this.videoCallService.peerConnection.createAnswer();

        await this.videoCallService.peerConnection.setLocalDescription(answer);

        await this.videoCallService.sendAnswer(
          this.videoCallService.roomId,
          answer
        );

        this.incomingOffer = null;
        this.callStatusText = 'Đang trong cuộc gọi';
        this.cdr.detectChanges();
      } catch (err) {
        console.error('Lỗi nhận cuộc gọi:', err);
        this.callStatusText = 'Không thể nhận cuộc gọi.';
        this.cdr.detectChanges();
      }
    }, 100);
  }

  rejectIncomingVideoCall(): void {
    if (this.videoCallService.roomId) {
      this.videoCallService.endCall(this.videoCallService.roomId);
    }

    this.incomingOffer = null;
    this.isIncomingVideoCall = false;
    this.callStatusText = 'Đã từ chối cuộc gọi';

    this.cdr.detectChanges();
  }

  private async openLocalCamera(): Promise<void> {
    this.localStream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

    this.localVideo.nativeElement.srcObject = this.localStream;

    await this.localVideo.nativeElement.play();

    this.localStream.getTracks().forEach(track => {
      this.videoCallService.peerConnection.addTrack(
        track,
        this.localStream!
      );
    });
  }

  private setupPeerConnectionEvents(): void {
    this.videoCallService.peerConnection.ontrack = event => {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
      this.callStatusText = 'Đang trong cuộc gọi';
      this.cdr.detectChanges();
    };

    this.videoCallService.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.videoCallService.sendCandidate(
          this.videoCallService.roomId,
          event.candidate
        );
      }
    };
  }

  private listenVideoEvents(): void {
    if (this.hasListeningVideoEvents) return;

    this.hasListeningVideoEvents = true;

    this.videoCallService.onReceiveOffer.subscribe(async offer => {
      console.log('NHẬN CUỘC GỌI ĐẾN:', offer);

      this.incomingOffer = offer;
      this.isIncomingVideoCall = true;
      this.isVideoCallOpen = false;
      this.callStatusText = 'Có cuộc gọi video đến';

      this.cdr.detectChanges();
    });

    this.videoCallService.onReceiveAnswer.subscribe(async answer => {
      await this.videoCallService.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      this.callStatusText = 'Đang trong cuộc gọi';
      this.cdr.detectChanges();
    });

    this.videoCallService.onReceiveCandidate.subscribe(async candidate => {
      if (this.videoCallService.peerConnection) {
        await this.videoCallService.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });

    this.videoCallService.onCallEnded.subscribe(() => {
      this.endVideoCall();
    });
  }

  endVideoCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.videoCallService.peerConnection) {
      this.videoCallService.peerConnection.close();
    }

    if (this.videoCallService.roomId) {
      this.videoCallService.endCall(this.videoCallService.roomId);
    }

    this.isVideoCallOpen = false;
    this.isIncomingVideoCall = false;
    this.incomingOffer = null;
  }

  closeVideoCall(): void {
    this.endVideoCall();
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.videoCallService.peerConnection) {
      this.videoCallService.peerConnection.close();
    }
  }
}