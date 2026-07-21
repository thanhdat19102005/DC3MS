import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RegisterReliefService {

  // inject HttpClient vào service
  constructor(private http: HttpClient) {}
  private apiUrl = `${environment.apiUrl}/Account/registerRelief`;
  // hàm gọi API
 postMessage(message: any): Observable<any> {
    // THÊM THAM SỐ THỨ 3: Cấu hình với withCredentials để mang theo Cookie trình duyệt
    return this.http.post<any>(this.apiUrl, message, {
      withCredentials: true 
    });
  }



}  
