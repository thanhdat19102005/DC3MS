import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

import {
  environment
} from '../../../app/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {

  hubConnection!: signalR.HubConnection;
  peerConnection!: RTCPeerConnection;

  roomId = '';

  onReceiveOffer = new Subject<any>();
  onReceiveAnswer = new Subject<any>();
  onReceiveCandidate = new Subject<any>();
  onCallEnded = new Subject<void>();

  async startConnection(): Promise<void> {
    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected
    ) {
      return;
    }

    this.hubConnection =
      new signalR.HubConnectionBuilder()
        .withUrl(
          `${environment.apiUrl}/videoCallHub`,
          {
            withCredentials: true
          }
        )
        .withAutomaticReconnect()
        .build();

    this.hubConnection.on(
      'ReceiveVideoOffer',
      offer => {
        console.log('SERVICE RECEIVE OFFER:', offer);
        this.onReceiveOffer.next(JSON.parse(offer));
      }
    );

    this.hubConnection.on(
      'ReceiveVideoAnswer',
      answer => {
        console.log('SERVICE RECEIVE ANSWER:', answer);
        this.onReceiveAnswer.next(JSON.parse(answer));
      }
    );

    this.hubConnection.on(
      'ReceiveIceCandidate',
      candidate => {
        console.log('SERVICE RECEIVE ICE:', candidate);
        this.onReceiveCandidate.next(JSON.parse(candidate));
      }
    );

    this.hubConnection.on(
      'VideoCallEnded',
      () => {
        console.log('SERVICE CALL ENDED');
        this.onCallEnded.next();
      }
    );

    await this.hubConnection.start();

    console.log(
      'VIDEO HUB CONNECTED:',
      this.hubConnection.connectionId
    );
  }

  createPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection =
      new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          },
          {
            urls: 'stun:stun1.l.google.com:19302'
          }
        ]
      });

    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        'WEBRTC CONNECTION STATE:',
        this.peerConnection.connectionState
      );
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        'WEBRTC ICE STATE:',
        this.peerConnection.iceConnectionState
      );
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log(
        'WEBRTC SIGNALING STATE:',
        this.peerConnection.signalingState
      );
    };
  }

  joinRoomForTeam(
    userIdOrPhoneNumber: string,
    teamId: string
  ): Promise<string> {
    return this.hubConnection.invoke(
      'JoinVideoRoomForTeam',
      userIdOrPhoneNumber,
      teamId
    );
  }

  joinRoomForUser(
    userIdOrPhoneNumber: string,
    teamId: string
  ): Promise<string> {
    return this.hubConnection.invoke(
      'JoinVideoRoomForUser',
      userIdOrPhoneNumber,
      teamId
    );
  }

  sendOffer(
    roomId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log('SERVICE SEND OFFER ROOM:', roomId);

    return this.hubConnection.invoke(
      'SendVideoOffer',
      roomId,
      JSON.stringify(offer)
    );
  }

  sendAnswer(
    roomId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log('SERVICE SEND ANSWER ROOM:', roomId);

    return this.hubConnection.invoke(
      'SendVideoAnswer',
      roomId,
      JSON.stringify(answer)
    );
  }

  sendCandidate(
    roomId: string,
    candidate: RTCIceCandidate | RTCIceCandidateInit
  ): Promise<void> {
    console.log('SERVICE SEND ICE ROOM:', roomId, candidate);

    return this.hubConnection.invoke(
      'SendIceCandidate',
      roomId,
      JSON.stringify(candidate)
    );
  }

  endCall(
    roomId: string
  ): Promise<void> {
    return this.hubConnection.invoke(
      'EndVideoCall',
      roomId
    );
  }

  stopConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}