import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RescueTeamService {

  // Nối trực tiếp domain + /api/ + ControllerName
  private apiUrl = `${environment.apiUrl}/api/RescueTeam`;

// URL dành cho Account (không có /api theo ảnh bạn gửi)
  private accountUrl = `${environment.apiUrl}/Account`;


  constructor(private http: HttpClient) {}



    // ==================================================
  // STATUS = 0
  // Danh sách yêu cầu chờ xử lý
  // GET: /api/RescueTeam/my-team-requests
  // ==================================================
  getMyTeamRequests(): Observable<any> {
   
    return this.http.get<any>(`${this.apiUrl}/my-team-requests`, { 
      withCredentials: true 
    });
  }


 // ==================================================
  // STATUS = 1
  // Danh sách yêu cầu đang ứng cứu
  // GET: /api/RescueTeam/my-rescuing-requests
  // ==================================================
  getRescuingRequests(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/my-rescuing-requests`,
      {
        withCredentials: true
      }
    );
  }

 // ==================================================
  // STATUS = 2
  // Danh sách yêu cầu đã hoàn thành
  // GET: /api/RescueTeam/my-completed-requests
  // ==================================================
getCompletedRequests(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/my-completed-requests`, { 
    withCredentials: true 
  });
}




// ==================================================
// NHẬN HỖ TRỢ
// Status: 0 -> 1 (Đang ứng cứu)
// PUT: /api/RescueTeam/accept-request/{id}
// ==================================================
acceptRequest(requestId: number): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/accept-request/${requestId}`,
    {},
    {
      withCredentials: true
    }
  );
}

// ==================================================
// HOÀN THÀNH CỨU HỘ
// Status: 1 -> 2 (Hoàn thành)
// PUT: /api/RescueTeam/complete-request/{id}
// ==================================================
completeRequest(requestId: number): Observable<any> {
  return this.http.put<any>(
    `${this.apiUrl}/complete-request/${requestId}`,
    {},
    {
      withCredentials: true
    }
  );
}





// API Đăng xuất (đúng đường dẫn /Account/logout)
  logout(): Observable<any> {
    return this.http.post<any>(`${this.accountUrl}/logout`, {}, { 
      withCredentials: true 
    });
  }

cancelRequest(requestId: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}/cancel-request/${requestId}`, {
    withCredentials: true
  });
}
  

getRequestDetail(id: number): Observable<any> {
  return this.http.get<any>(
    `${this.apiUrl}/request-detail/${id}`,
    {
      withCredentials: true
    }
  );
}



// ==================================================
// THÔNG TIN ĐỘI + TÀI KHOẢN ĐĂNG NHẬP
// GET: /api/RescueTeam/my-team-profile
// ==================================================
getMyTeamProfile(): Observable<any> {
  return this.http.get<any>(
    `${this.apiUrl}/my-team-profile`,
    {
      withCredentials: true
    }
  );
}


updateTeamInfo(teamId: string, data: any, file: File | null): Observable<any> {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });

  if (file) {
    formData.append('FileAttachments', file);
  }

  return this.http.put<any>(
    `${this.apiUrl}/${teamId}`,
    formData,
    {
      withCredentials: true
    }
  );
}






// ==================================================
// ĐỔI MẬT KHẨU TÀI KHOẢN ĐỘI CỨU HỘ
// PUT: /api/RescueTeam/change-password
// ==================================================
changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Observable<any> {

  return this.http.put<any>(
    `${this.apiUrl}/change-password`,
    {
      currentPassword,
      newPassword,
      confirmPassword
    },
    {
      withCredentials: true
    }
  );
}









}