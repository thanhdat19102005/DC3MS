import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  environment
} from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UserRescueMapService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}

  // ==========================
  // LẤY ĐỘI CỨU HỘ ĐANG HOẠT ĐỘNG
  // ==========================
  getActiveTeams() {
    return this.http.get(
      `${this.apiUrl}/api/RescueTeam/active-teams`,
      {
        withCredentials: true
      }
    );
  }

  
getMyActiveRequestLocation() {
  return this.http.get(
    `${this.apiUrl}/User/my-active-request-location`,
    {
      withCredentials: true
    }
  );
}





}