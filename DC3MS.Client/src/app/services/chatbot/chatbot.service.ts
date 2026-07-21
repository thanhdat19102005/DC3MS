import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ChatBotService {

  // inject HttpClient vào service
  constructor(private http: HttpClient) {}
  private apiUrl = `${environment.apiUrl}/chat`;
  // hàm gọi API
  postMessage(message: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, message);
  }



}  
