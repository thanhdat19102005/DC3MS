import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  environment
} from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminAccountService {

  private apiUrl =
    `${environment.apiUrl}/api/admin/accounts`;

  constructor(
    private http: HttpClient
  ) {}

  getAdminAccounts(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/admin-accounts`,
      {
        withCredentials: true
      }
    );
  }

  createAdminAccount(data: any): Observable<any> {
    return this.http.post<any>(
      this.apiUrl,
      data,
      {
        withCredentials: true
      }
    );
  }

  updateAdminAccount(id: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/${id}`,
      data,
      {
        withCredentials: true
      }
    );
  }

  deleteAdminAccount(id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/${id}`,
      {
        withCredentials: true
      }
    );
  }
}