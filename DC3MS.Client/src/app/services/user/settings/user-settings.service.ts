import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}

  // ==========================
  // LẤY PROFILE
  // ==========================
  getProfile() {
    return this.http.get(
      `${this.apiUrl}/User/profile`,
      {
        withCredentials: true
      }
    );
  }

 

 // UPDATE PROFILE
// ==========================
updateProfile(formData: FormData) {
  return this.http.put(
    `${this.apiUrl}/User/update-profile`,
    formData,
    {
      withCredentials: true
    }
  );
}


changePassword(data: any) {
  return this.http.put(
    `${this.apiUrl}/User/change-password`,
    data,
    {
      withCredentials: true
    }
  );
}






}




