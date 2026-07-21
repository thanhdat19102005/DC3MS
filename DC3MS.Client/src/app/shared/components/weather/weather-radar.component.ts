import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; 
import * as L from 'leaflet';

@Component({
  selector: 'app-weather-radar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './weather-radar.component.html',
  styleUrl: './weather-radar.component.css'
})
export class WeatherRadarComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private radarLayers: L.TileLayer[] = [];
  private timestamps: number[] = [];
  private radarPaths: string[] = [];
  
  private currentFrameIndex = 0;
  private animationInterval: any;

  // Cấu hình các Signals trạng thái hiển thị của UI
  public currentTimeString = signal<string>('Đang đồng bộ vệ tinh khí tượng...');
  public isVisualizing = signal<boolean>(true);
  public isPlaying = signal<boolean>(true);
  
  // Chế độ xem mặc định: 'rain' (lượng mưa bão) hoặc 'temperature' (lưu lượng nhiệt)
  public currentMode = signal<'rain' | 'temperature'>('rain'); 

  ngOnInit(): void {
    this.initMap();
    this.initWeatherTimeline();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    if (this.map) {
      this.map.remove();
    }
  }

  // Tạo bản đồ nền Dark Mode lấy tâm trung tâm Việt Nam
  private initMap(): void {
    this.map = L.map('weather-map', {
      center: [16.047079, 107.570014], 
      zoom: 5.5,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18
    }).addTo(this.map);
  }

  // Gọi API lấy chuỗi dòng thời gian các khung hình từ trạm khí tượng
  private initWeatherTimeline(): void {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(response => response.json())
      .then(data => {
        if (data && data.radar && data.radar.past.length > 0) {
          
          /* 🔥 TỐI ƯU 1: Cắt lấy đúng 6 mốc thời gian gần nhất để giảm tải lượng request khởi tạo */
          const recentFrames = data.radar.past.slice(-6);

          recentFrames.forEach((frame: any) => {
            this.timestamps.push(frame.time);
            this.radarPaths.push(frame.path);
          });

          this.rebuildRadarLayers();
          this.startAnimation();
          this.isVisualizing.set(false);
        }
      })
      .catch(err => {
        console.error('❌ Lỗi trạm khí tượng:', err);
        this.currentTimeString.set('Mất kết nối vệ tinh thời tiết');
        this.isVisualizing.set(false);
      });
  }

  // Tái cấu trúc lớp phủ màu tương ứng theo chế độ người dùng click xem
  private rebuildRadarLayers(): void {
    /* 🔥 TỐI ƯU 2: Duyệt xóa triệt để tất cả các layer cũ đang lơ lửng trên map trước khi làm rỗng mảng */
    this.radarLayers.forEach(layer => {
      if (this.map && this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });
    
    this.radarLayers = [];

    // Mã màu chuẩn GIS: 2 = Lượng mưa, 5 = Lưu lượng vùng bức xạ nhiệt
    const colorCode = this.currentMode() === 'rain' ? 2 : 5;

    /* 🔥 TỐI ƯU 3: Chỉ khởi tạo cấu hình ẩn trong mảng, TUYỆT ĐỐI KHÔNG dùng .addTo(this.map) ở đây nữa để tránh tải dồn dập 6 layer cùng lúc */
    this.radarPaths.forEach((path) => {
      const layer = L.tileLayer(`https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/${colorCode}/1_1.png`, {
        opacity: this.currentMode() === 'rain' ? 0.65 : 0.75, 
        zIndex: 100
      });
      this.radarLayers.push(layer);
    });
  }

  // Hoán đổi khung hình tạo chuyển động hoạt ảnh chuẩn Lazy Load
  private showFrame(index: number): void {
    if (this.radarLayers.length === 0) return;

    /* 🔥 TỐI ƯU 4: Tìm layer của khung hình vừa chạy xong, xóa hẳn nó ra khỏi bản đồ để triệt tiêu request tải ngầm */
    const oldFrame = this.radarLayers[this.currentFrameIndex];
    if (oldFrame && this.map.hasLayer(oldFrame)) {
      this.map.removeLayer(oldFrame);
    }

    /* 🔥 TỐI ƯU 5: Chạy đến khung hình nào mới add đúng layer đó vào bản đồ để tải ảnh đơn lẻ */
    const newFrame = this.radarLayers[index];
    if (newFrame) {
      newFrame.addTo(this.map);
    }

    this.currentFrameIndex = index;

    const date = new Date(this.timestamps[index] * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const prefix = this.currentMode() === 'rain' ? 'Vệ tinh quét mưa' : 'Quét lưu lượng vùng nhiệt';
    this.currentTimeString.set(`${prefix}: ${hours}:${minutes} - Ngày ${date.getDate()}/${date.getMonth() + 1}`);
  }

  public startAnimation(): void {
    this.stopAnimation();
    this.isPlaying.set(true);
    
    /* 🔥 TỐI ƯU 6: Tăng thời gian delay hoạt ảnh lên 1500ms (1.5 giây) để tạo quãng nghỉ cho server nạp ảnh */
    this.animationInterval = setInterval(() => {
      let nextFrame = this.currentFrameIndex + 1;
      if (nextFrame >= this.radarLayers.length) nextFrame = 0;
      this.showFrame(nextFrame);
    }, 1500);
  }

  public stopAnimation(): void {
    this.isPlaying.set(false);
    if (this.animationInterval) clearInterval(this.animationInterval);
  }

  public togglePlay(): void {
    this.isPlaying() ? this.stopAnimation() : this.startAnimation();
  }

  // Hàm click chuyển đổi Tab tính năng Mưa bão / Lưu lượng nhiệt
  public changeMode(mode: 'rain' | 'temperature'): void {
    if (this.currentMode() === mode) return;
    this.isVisualizing.set(true);
    this.stopAnimation();
    
    this.currentMode.set(mode);
    this.currentFrameIndex = 0; 
    
    this.rebuildRadarLayers();
    this.startAnimation();
    this.isVisualizing.set(false);
  }
}