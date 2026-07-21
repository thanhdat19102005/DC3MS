import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../app/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RequestHistoryService {

  // inject HttpClient vào service
  constructor(private http: HttpClient) {}

  //  GIỮ NGUYÊN CÁI GỐC CỦA ĐẠT: Chỉ là địa chỉ Base kết thúc bằng dấu gạch chéo
  private apiUrl = `${environment.apiUrl}/`;

  // Hàm gọi API lấy đơn hoạt động hiện tại (Phương thức GET)
  getActiveRequest(): Observable<any> {
    //  CỘNG CHUỖI ĐỘNG: apiUrl gốc + "User/my-active-request"
    return this.http.get<any>(`${this.apiUrl}User/my-active-request`, {
      withCredentials: true 
    });
  }

  // Hàm gửi dữ liệu chỉnh sửa lên API Put của Backend C# theo đúng Swagger /User/{id}
  updateRequest(id: number, payload: any): Observable<any> {
    //  CỘNG CHUỖI ĐỘNG: apiUrl gốc + "User/" + id
    return this.http.put<any>(`${this.apiUrl}User/${id}`, payload, {
      withCredentials: true
    });
  }

deleteRequest(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}User/${id}`, {
      withCredentials: true
    });
  }




}