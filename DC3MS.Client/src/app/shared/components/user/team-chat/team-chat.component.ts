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
import { HttpClient, HttpClientModule } from '@angular/common/http';

import {
  RescueChatService
} from '../../../../services/user/rescue-chat/rescue-chat.service';

import {
  environment
} from '../../../../environments/environment.development';

import {
  VideoCallService
} from '../../../../services/video-call/video-call.service';

@Component({
  selector: 'app-team-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './team-chat.component.html',
  styleUrl: './team-chat.component.css'
})
export class TeamChatComponent implements OnInit, OnDestroy {

  @Input() selectedTeam: any = null;
  @Input() activeRequest: any = null;

  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('localVideo')
  localVideo!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideo')
  remoteVideo!: ElementRef<HTMLVideoElement>;

  messageText = '';
  messages: any[] = [];
  isConnected = false;

  isVideoCallOpen = false;
  isIncomingVideoCall = false;
  callStatusText = 'Đang gọi video...';

  private localStream: MediaStream | null = null;
  private incomingOffer: RTCSessionDescriptionInit | null = null;
  private hasListeningVideoEvents = false;
  
  
  constructor(
    private rescueChatService: RescueChatService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private videoCallService: VideoCallService
  ) {}

  ngOnInit(): void {
    if (!this.selectedTeam?.id) {
      console.warn('Không có teamId để join room.');
      return;
    }

    this.loadHistory();

    const teamId = this.selectedTeam.id;

    this.rescueChatService
      .startConnection()
      .then(() => {
        this.isConnected = true;
        return this.rescueChatService.joinRoom(teamId);
      })
      .then(() => {
        this.rescueChatService.onReceiveMessage((data: any) => {
          this.messages.push({
            sender: data.senderType,
            text: data.message,
            time: new Date(data.sentAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            })
          });

          this.cdr.detectChanges();
        });
      })
      .catch((err) => {
        this.isConnected = false;
        console.error('Lỗi SignalR:', err);
      });

    this.startVideoSignalRForIncomingCall();
  }

  private getPhoneNumber(): string {
    return (
      this.activeRequest?.phoneNumber ||
      this.activeRequest?.phone ||
      ''
    );
  }

  private getTeamId(): string {
    return this.selectedTeam?.id || '';
  }

  private loadHistory(): void {
    const teamId = this.selectedTeam?.id;

    const phoneNumber =
      this.activeRequest?.phoneNumber ||
      this.activeRequest?.phone;

    console.log('LOAD HISTORY PARAMS:', {
      teamId,
      phoneNumber,
      activeRequest: this.activeRequest
    });

    if (!teamId || !phoneNumber) {
      console.warn('Thiếu teamId hoặc phoneNumber để load lịch sử.');
      return;
    }

    this.http.get<any[]>(
      `${environment.apiUrl}/api/RescueChat/history`,
      {
        params: {
          phoneNumber,
          teamId
        },
        withCredentials: true
      }
    ).subscribe({
      next: (data) => {
        this.messages = data.map(x => ({
          sender: x.senderType,
          text: x.message,
          time: new Date(x.sentAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }));

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi load lịch sử chat:', err);
      }
    });
  }

  sendMessage(): void {
    const text = this.messageText.trim();

    if (!text) return;
    if (!this.selectedTeam?.id) return;
    if (!this.isConnected) return;

    this.rescueChatService
      .sendMessage(
        this.selectedTeam.id,
        'user',
        'Người dân',
        text
      )
      .then(() => {
        this.messageText = '';
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('Lỗi gửi tin nhắn:', err);
      });
  }

  close(): void {
    this.closeChat.emit();
  }

  private async startVideoSignalRForIncomingCall(): Promise<void> {
    const phoneNumber = this.getPhoneNumber();
    const teamId = this.getTeamId();

    if (!phoneNumber || !teamId) {
      console.warn('Thiếu phoneNumber hoặc teamId để join video room.', {
        phoneNumber,
        teamId,
        activeRequest: this.activeRequest,
        selectedTeam: this.selectedTeam
      });
      return;
    }

    try {
      await this.videoCallService.startConnection();

      this.videoCallService.roomId =
        await this.videoCallService.joinRoomForTeam(
          phoneNumber,
          teamId
        );

      console.log(
        'USER JOIN VIDEO ROOM:',
        this.videoCallService.roomId
      );

      this.listenVideoEvents();
    } catch (err) {
      console.error('Lỗi join video room user:', err);
    }
  }

  async openVideoCall(): Promise<void> {
    const phoneNumber = this.getPhoneNumber();
    const teamId = this.getTeamId();

    if (!phoneNumber || !teamId) {
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
              teamId
            );
        }

        console.log('ROOM ID:', this.videoCallService.roomId);

        this.videoCallService.createPeerConnection();

        await this.openLocalCamera();

        this.setupPeerConnectionEvents();

        const offer =
          await this.videoCallService.peerConnection.createOffer();

        await this.videoCallService.peerConnection.setLocalDescription(
          offer
        );

        await this.videoCallService.sendOffer(
          this.videoCallService.roomId,
          offer
        );

        this.callStatusText = 'Đang gọi video...';

        this.cdr.detectChanges();
      } catch (err) {
        console.error('Lỗi mở video call user:', err);
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

        await this.videoCallService.peerConnection.setLocalDescription(
          answer
        );

        await this.videoCallService.sendAnswer(
          this.videoCallService.roomId,
          answer
        );

        this.incomingOffer = null;
        this.callStatusText = 'Đang trong cuộc gọi';

        this.cdr.detectChanges();
      } catch (err) {
        console.error('Lỗi nhận cuộc gọi user:', err);
        this.callStatusText = 'Không thể nhận cuộc gọi.';
        this.cdr.detectChanges();
      }
    }, 100);
  }

  rejectIncomingVideoCall(): void {
    if (this.videoCallService.roomId) {
      this.videoCallService.endCall(
        this.videoCallService.roomId
      );
    }

    this.incomingOffer = null;
    this.isIncomingVideoCall = false;
    this.callStatusText = 'Đã từ chối cuộc gọi';

    this.cdr.detectChanges();
  }

  private async waitForVideoElement(): Promise<void> {
    this.cdr.detectChanges();

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async openLocalCamera(): Promise<void> {
    await this.waitForVideoElement();

    if (!this.localVideo?.nativeElement) {
      throw new Error('localVideo chưa render.');
    }

    try {
      this.localStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
    } catch (err) {
      console.warn('Không mở được camera, thử audio only:', err);

      this.localStream =
        await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
    }

    this.localVideo.nativeElement.srcObject =
      this.localStream;

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
      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject =
          event.streams[0];
      }

      this.callStatusText = 'Đang trong cuộc gọi';

      this.cdr.detectChanges();
    };

    this.videoCallService.peerConnection.onicecandidate = event => {
      if (
        event.candidate &&
        this.videoCallService.peerConnection &&
        this.videoCallService.peerConnection.signalingState !== 'closed'
      ) {
        this.videoCallService.sendCandidate(
          this.videoCallService.roomId,
          event.candidate
        );
      }
    };
  }

  private listenVideoEvents(): void {
    if (this.hasListeningVideoEvents) {
      return;
    }

    this.hasListeningVideoEvents = true;

    this.videoCallService.onReceiveOffer.subscribe(
      async offer => {
        console.log('USER NHẬN CUỘC GỌI ĐẾN:', offer);

        this.incomingOffer = offer;
        this.isIncomingVideoCall = true;
        this.isVideoCallOpen = false;
        this.callStatusText = 'Có cuộc gọi video đến';

        this.cdr.detectChanges();
      }
    );

    this.videoCallService.onReceiveAnswer.subscribe(
      async answer => {
        if (
          this.videoCallService.peerConnection &&
          this.videoCallService.peerConnection.signalingState !== 'closed'
        ) {
          await this.videoCallService.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        }

        this.callStatusText = 'Đang trong cuộc gọi';

        this.cdr.detectChanges();
      }
    );

    this.videoCallService.onReceiveCandidate.subscribe(
      async candidate => {
        if (
          this.videoCallService.peerConnection &&
          this.videoCallService.peerConnection.signalingState !== 'closed'
        ) {
          try {
            await this.videoCallService.peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (err) {
            console.warn('Bỏ qua ICE candidate lỗi:', err);
          }
        }
      }
    );

    this.videoCallService.onCallEnded.subscribe(() => {
      this.closeVideoCallLocalOnly();
    });
  }

  private closeVideoCallLocalOnly(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.videoCallService.peerConnection) {
      this.videoCallService.peerConnection.close();
    }

    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }

    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }

    this.isVideoCallOpen = false;
    this.isIncomingVideoCall = false;
    this.incomingOffer = null;

    this.cdr.detectChanges();
  }

  endVideoCall(): void {
    if (this.videoCallService.roomId) {
      this.videoCallService.endCall(
        this.videoCallService.roomId
      );
    }

    this.closeVideoCallLocalOnly();
  }

  closeVideoCall(): void {
    this.endVideoCall();
  }

  ngOnDestroy(): void {
    this.rescueChatService.stopConnection();

    this.closeVideoCallLocalOnly();
  }
}