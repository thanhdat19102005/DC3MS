import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NewsService } from '../../../services/news/new.service'; // Import Service vừa tạo

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css'
})
export class NewsComponent implements OnInit {
  public newsList: any[] = [];
  public isLoading: boolean = true; 

  private newsService = inject(NewsService); // Inject Service thay vì HttpClient
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Gọi hàm từ Service
    this.newsService.getNews().subscribe({
      next: (data: any[]) => {
        this.newsList = data;
        this.isLoading = false; 
        this.cdr.detectChanges(); // Ép cập nhật giao diện
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Lỗi khi tải tin tức:', err);
        this.cdr.detectChanges();
      }
    });
  }
}