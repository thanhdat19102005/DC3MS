import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class EmergencyRequestService {
  constructor(private http: HttpClient) {}

  createEmergencyRequest(data: any, files: File[]) {
    const formData = new FormData();

    // 1. Gộp dữ liệu chữ
    Object.keys(data).forEach(key => {
      if (data[key] !== null) formData.append(key, data[key]);
    });

    // 2. Gộp danh sách file - Tên key phải khớp với Backend
    files.forEach(file => {
      formData.append('FileAttachments', file);
    });

    return this.http.post(`${environment.apiUrl}/User/create`, formData, {
      withCredentials: true //  BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ FIX LỖI 401
    });
  }
}



