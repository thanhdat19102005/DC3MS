import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  VideoCallService
} from '../../services/video-call/video-call.service';

@Component({
  selector: 'app-video-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './video-test.component.html',
  styleUrl: './video-test.component.css'
})
export class VideoTestComponent implements OnInit, OnDestroy {

  @ViewChild('localVideo')
  localVideo!: ElementRef<HTMLVideoElement>;

  @ViewChild('remoteVideo')
  remoteVideo!: ElementRef<HTMLVideoElement>;

  readonly phoneNumber =
    '0902387953';

  readonly teamId =
    'TEAM-HCM-Q1';

  roomId = '';

  statusText = 'Chưa kết nối';

  isConnected = false;
  isCameraOn = false;
  hasIncomingCall = false;
  isInCall = false;

  private localStream: MediaStream | null = null;
  private incomingOffer: RTCSessionDescriptionInit | null = null;

  constructor(
    private videoCallService: VideoCallService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.startVideoSignalR();
    await this.startCamera();
  }

  private async startVideoSignalR(): Promise<void> {
    try {
      this.statusText = 'Đang kết nối Video Hub...';

      await this.videoCallService.startConnection();

      this.isConnected = true;

      this.roomId =
        await this.videoCallService.joinRoomForTeam(
          this.phoneNumber,
          this.teamId
        );

      this.videoCallService.roomId =
        this.roomId;

      console.log(
        'ĐÃ JOIN VIDEO ROOM:',
        this.roomId
      );

      this.statusText =
        'Đã vào phòng video test';

      this.listenVideoEvents();

      this.cdr.detectChanges();
    } catch (err) {
      console.error(
        'Lỗi kết nối Video Hub:',
        err
      );

      this.statusText =
        'Lỗi kết nối Video Hub';

      this.cdr.detectChanges();
    }
  }

  async startCamera(): Promise<void> {
    try {
      this.statusText =
        'Đang mở camera...';

      this.cdr.detectChanges();

      this.localStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject =
          this.localStream;

        await this.localVideo.nativeElement.play();
      }

      this.isCameraOn = true;

      this.statusText =
        'Camera đã bật, đang chờ cuộc gọi...';

      this.cdr.detectChanges();
    } catch (err) {
      console.error(
        'Lỗi mở camera:',
        err
      );

      this.statusText =
        'Không mở được camera. Hãy cấp quyền Camera/Micro.';

      alert(
        'Không mở được camera. Hãy cấp quyền Camera/Micro cho trình duyệt.'
      );

      this.cdr.detectChanges();
    }
  }

  private createPeerConnection(): void {
    this.videoCallService.createPeerConnection();

    this.videoCallService.peerConnection.ontrack =
      (event) => {
        console.log(
          'REMOTE TRACK RECEIVED:',
          event
        );

        if (this.remoteVideo?.nativeElement) {
          this.remoteVideo.nativeElement.srcObject =
            event.streams[0];
        }

        this.statusText =
          'Đang trong cuộc gọi';

        this.isInCall = true;

        this.cdr.detectChanges();
      };

    this.videoCallService.peerConnection.onicecandidate =
      (event) => {
        if (event.candidate) {
          console.log(
            'SEND ICE CANDIDATE:',
            event.candidate
          );

          this.videoCallService.sendCandidate(
            this.roomId,
            event.candidate
          );
        }
      };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.videoCallService.peerConnection.addTrack(
          track,
          this.localStream!
        );
      });
    }
  }

  async startCall(): Promise<void> {
    try {
      if (!this.isConnected) {
        alert('Video Hub chưa kết nối.');
        return;
      }

      if (!this.isCameraOn) {
        await this.startCamera();
      }

      this.createPeerConnection();

      const offer =
        await this.videoCallService.peerConnection.createOffer();

      await this.videoCallService.peerConnection.setLocalDescription(
        offer
      );

      await this.videoCallService.sendOffer(
        this.roomId,
        offer
      );

      console.log(
        'SEND OFFER:',
        offer
      );

      this.statusText =
        'Đang gọi...';

      this.isInCall = true;

      this.cdr.detectChanges();
    } catch (err) {
      console.error(
        'Lỗi startCall:',
        err
      );

      this.statusText =
        'Lỗi khi bắt đầu gọi';

      this.cdr.detectChanges();
    }
  }

  async acceptCall(): Promise<void> {
    try {
      if (!this.incomingOffer) {
        console.warn(
          'Không có cuộc gọi đến.'
        );
        return;
      }

      if (!this.isCameraOn) {
        await this.startCamera();
      }

      this.createPeerConnection();

      await this.videoCallService.peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.incomingOffer)
      );

      const answer =
        await this.videoCallService.peerConnection.createAnswer();

      await this.videoCallService.peerConnection.setLocalDescription(
        answer
      );

      await this.videoCallService.sendAnswer(
        this.roomId,
        answer
      );

      console.log(
        'SEND ANSWER:',
        answer
      );

      this.hasIncomingCall = false;
      this.incomingOffer = null;
      this.isInCall = true;

      this.statusText =
        'Đang trong cuộc gọi';

      this.cdr.detectChanges();
    } catch (err) {
      console.error(
        'Lỗi acceptCall:',
        err
      );

      this.statusText =
        'Lỗi khi nhận cuộc gọi';

      this.cdr.detectChanges();
    }
  }

  rejectCall(): void {
    if (
      this.isConnected &&
      this.roomId
    ) {
      this.videoCallService.endCall(
        this.roomId
      );
    }

    this.hasIncomingCall =
      false;

    this.incomingOffer =
      null;

    this.statusText =
      'Đã từ chối cuộc gọi';

    this.cdr.detectChanges();
  }

  private listenVideoEvents(): void {
    this.videoCallService.onReceiveOffer.subscribe(
      async (offer: RTCSessionDescriptionInit) => {
        console.log(
          'RECEIVE OFFER:',
          offer
        );

        this.incomingOffer =
          offer;

        this.hasIncomingCall =
          true;

        this.statusText =
          'Có cuộc gọi đến';

        this.cdr.detectChanges();
      }
    );

    this.videoCallService.onReceiveAnswer.subscribe(
      async (answer: RTCSessionDescriptionInit) => {
        console.log(
          'RECEIVE ANSWER:',
          answer
        );

        await this.videoCallService.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        this.statusText =
          'Đang trong cuộc gọi';

        this.isInCall =
          true;

        this.cdr.detectChanges();
      }
    );

    this.videoCallService.onReceiveCandidate.subscribe(
      async (candidate: RTCIceCandidateInit) => {
        console.log(
          'RECEIVE ICE CANDIDATE:',
          candidate
        );

        if (this.videoCallService.peerConnection) {
          await this.videoCallService.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      }
    );

    this.videoCallService.onCallEnded.subscribe(() => {
      this.resetCall();

      this.statusText =
        'Cuộc gọi đã kết thúc';
    });
  }

  endCall(): void {
    if (
      this.isConnected &&
      this.roomId
    ) {
      this.videoCallService.endCall(
        this.roomId
      );
    }

    this.resetCall();
  }

  private resetCall(): void {
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject =
        null;
    }

    if (this.videoCallService.peerConnection) {
      this.videoCallService.peerConnection.close();
    }

    this.hasIncomingCall =
      false;

    this.incomingOffer =
      null;

    this.isInCall =
      false;

    this.statusText =
      'Đã kết thúc cuộc gọi';

    this.cdr.detectChanges();
  }

  stopCamera(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });

      this.localStream =
        null;
    }

    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject =
        null;
    }

    this.isCameraOn =
      false;

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopCamera();

    if (this.videoCallService.peerConnection) {
      this.videoCallService.peerConnection.close();
    }

    this.videoCallService.stopConnection();
  }
}