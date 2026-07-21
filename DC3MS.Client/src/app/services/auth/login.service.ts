import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})

export class LoginService {

  constructor(
    private http: HttpClient
  ) {}

  // ================= API ROOT =================

  private apiUrl =
    environment.apiUrl;

  // ================= LOGIN =================

  // Cập nhật hàm postMessage nhận thêm tham số role
postMessage(message: any, role: string): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/Account/login?requestedRole=${role}`,
    message,
    { withCredentials: true }
  );
}
  // ================= GOOGLE LOGIN =================

  googleLogin(
    idToken: string
  ): Observable<any> {

    return this.http.post(

      `${this.apiUrl}/GoogleAuth/google-login`,

      {
        idToken: idToken
      },

      {
        withCredentials: true
      }

    );

  }

  // ================= PROFILE =================

  profile(): Observable<any> {

    return this.http.get(

      `${this.apiUrl}/Account/profile`,

      {
        withCredentials: true
      }

    );

  }

  // ================= LOGOUT =================

  logout(): Observable<any> {

    return this.http.post(

      `${this.apiUrl}/Account/logout`,

      {},

      {
        withCredentials: true
      }

    );

  }

}