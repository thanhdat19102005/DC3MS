import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment.development';

export interface SendSmsRequest {
  phoneTo: string;
  content: string;
}

export interface SendAllSmsRequest {
  content: string;
}

export interface SendSmsResponse {
  success?: boolean;
  message: string;
  data?: any;
  result?: any;
  error?: any;
  total?: number;
}

export interface ReceivedSmsItem {
  id: number;
  phone: string;
  content: string;
  isRead: boolean;
  time: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmsService {

  private readonly apiUrl =
    `${environment.apiUrl}/api/Sms`;

  constructor(
    private http: HttpClient
  ) {}

  sendSms(
    phoneTo: string,
    content: string
  ): Observable<SendSmsResponse> {

    const body: SendSmsRequest = {
      phoneTo,
      content
    };

    return this.http.post<SendSmsResponse>(
      `${this.apiUrl}/send`,
      body,
      {
        withCredentials: true
      }
    );
  }

  sendSmsToAllCitizens(
    content: string
  ): Observable<SendSmsResponse> {

    const body: SendAllSmsRequest = {
      content
    };

    return this.http.post<SendSmsResponse>(
      `${this.apiUrl}/send-all-citizens`,
      body,
      {
        withCredentials: true
      }
    );
  }

  getReceivedSms(): Observable<ReceivedSmsItem[]> {
    return this.http.get<ReceivedSmsItem[]>(
      `${this.apiUrl}/received`,
      {
        withCredentials: true
      }
    );
  }

deleteReceivedSms(id: number) {
  return this.http.delete(
    `${this.apiUrl}/received/${id}`,
    {
      withCredentials: true
    }
  );
}





}