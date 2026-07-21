import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  environment
} from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminRescueTeamService {

  private apiUrl =
    `${environment.apiUrl}/api/admin/rescue-teams`;

  constructor(
    private http: HttpClient
  ) {}

  getRescueTeamAccounts(): Observable<any> {
    return this.http.get<any>(
      this.apiUrl,
      {
        withCredentials: true
      }
    );
  }

  getRescueTeamDetail(rescueTeamId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/detail/${rescueTeamId}`,
      {
        withCredentials: true
      }
    );
  }

  deleteRescueTeamAccount(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }

 updateRescueTeamAccount(id: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/${id}`,
      data,
      {
        withCredentials: true
      }
    );
  }

createRescueTeamWithAccount(data: any): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/create-team-with-account`,
    data,
    {
      withCredentials: true
    }
  );
}


getRescueTeamRequestStatistics(): Observable<any> {
  return this.http.get<any>(
    `${this.apiUrl}/request-statistics`,
    {
      withCredentials: true
    }
  );
}

createRequestForTeam(data: any, files: File[]): Observable<any> {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    if (
      data[key] !== null &&
      data[key] !== undefined
    ) {
      formData.append(key, data[key]);
    }
  });

  files.forEach(file => {
    formData.append('FileAttachments', file);
  });

  return this.http.post<any>(
    `${this.apiUrl}/create-request-for-team`,
    formData,
    {
      withCredentials: true
    }
  );
}



}