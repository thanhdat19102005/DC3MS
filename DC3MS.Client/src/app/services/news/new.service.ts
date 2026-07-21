import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' // Service này có thể dùng ở bất kỳ đâu trong project
})
export class NewsService {
  private http = inject(HttpClient);
  private apiUrl = 'https://localhost:7076/api/News';

  // Hàm trả về Observable giúp component lắng nghe dữ liệu
  public getNews(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}