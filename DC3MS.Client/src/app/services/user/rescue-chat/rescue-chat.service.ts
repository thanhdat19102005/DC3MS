import {
  Injectable
} from '@angular/core';

import * as signalR from '@microsoft/signalr';

import {
  environment
} from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RescueChatService {

  private hubConnection!: signalR.HubConnection;

  // =========================
  // START CONNECTION
  // =========================
  startConnection(): Promise<void> {
    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected
    ) {
      return Promise.resolve();
    }

    this.hubConnection =
      new signalR.HubConnectionBuilder()
        .withUrl(
          `${environment.apiUrl}/rescueChatHub`,
          {
            withCredentials: true
          }
        )
        .withAutomaticReconnect()
        .build();

    return this.hubConnection.start();
  }

  // =========================
  // JOIN ROOM THEO TEAM ID
  // Server tự lấy Email/UserId từ token
  // =========================
  joinRoom(teamId: string): Promise<void> {
    return this.hubConnection.invoke(
      'JoinRescueRoom',
      teamId
    );
  }

  // =========================
  // SEND MESSAGE
  // =========================
  sendMessage(
    teamId: string,
    senderType: string,
    senderName: string,
    message: string
  ): Promise<void> {
    return this.hubConnection.invoke(
      'SendRescueMessage',
      teamId,
      senderType,
      senderName,
      message
    );
  }

  // =========================
  // LISTEN MESSAGE
  // =========================
  onReceiveMessage(callback: (data: any) => void): void {
    this.hubConnection.off('ReceiveRescueMessage');

    this.hubConnection.on(
      'ReceiveRescueMessage',
      callback
    );
  }

  // =========================
  // STOP CONNECTION
  // =========================
  stopConnection(): Promise<void> {
    if (!this.hubConnection) {
      return Promise.resolve();
    }

    return this.hubConnection.stop();
  }
}