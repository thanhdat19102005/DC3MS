import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  signal,
  OnDestroy,
  ViewChild
} from '@angular/core';

import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { ChatbotComponent } from '../chatbot/chatbot.component';
import { GuideComponent } from '../guide/guide.component';
import { EmergencyRequestComponent } from '../request/emergency/emergency-request.component';
import { DetailedRequestComponent } from '../request/detailed/detailed-request.component';
import { RequestHistoryComponent } from '../request/request-history/request-history.component';

import { UserSettingsComponent } from './user-settings/user-settings.component';

import {
  UserRescueMapComponent
} from './user-rescue-map/user-rescue-map.component';

import {
  UserRescueMapService
} from '../../../services/user/user-rescue-map/user-rescue-map.service';

import {
  TeamChatComponent
} from './team-chat/team-chat.component';

import { LoginService } from '../../../services/auth/login.service';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    HttpClientModule,
    RouterLink,
    ChatbotComponent,
    GuideComponent,
    EmergencyRequestComponent,
    DetailedRequestComponent,
    RequestHistoryComponent,
    UserSettingsComponent,
    UserRescueMapComponent,
    TeamChatComponent
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit, OnDestroy {
  protected readonly title = signal('DC3MS.Client');

  @ViewChild(UserRescueMapComponent)
  userRescueMapComponent!: UserRescueMapComponent;

  isChatOpen = false;
  isGuideOpen = false;
  isEmergencyOpen = false;
  isDetailedOpen = false;
  isRequestHistoryOpen = false;
  isSettingsOpen = false;

  weather = {
    city: 'Vị trí hiện tại',
    temperature: '--',
    condition: 'Đang lấy vị trí...',
    humidity: '--',
    windSpeed: '--',
    warning: 'Đang cập nhật'
  };

  activeRescueTeams: any[] = [];

  userMapLocation = {
    latitude: 10.8231,
    longitude: 106.6297
  };

  // =========================
  // CHAT ĐỘI CỨU HỘ
  // =========================

  isTeamChatOpen = false;

  selectedTeam: any = null;

  // =========================
  // REQUEST ĐANG HOẠT ĐỘNG CỦA USER
  // Dùng để truyền phoneNumber xuống TeamChatComponent
  // để load lịch sử chat
  // =========================

  activeRequestForMap: any = null;

  currentDateTime: string = '';

  private clockInterval: any;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,
    private router: Router,
    private userRescueMapService: UserRescueMapService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.getCurrentUserLocation();
    }, 300);

    this.updateCurrentDateTime();

    this.loadActiveRescueTeams();

    this.clockInterval = setInterval(() => {
      this.updateCurrentDateTime();
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  // =========================
  // NHẬN ACTIVE REQUEST TỪ MAP COMPONENT
  // =========================

  onActiveRequestChanged(request: any): void {
    console.log('ACTIVE REQUEST FOR CHAT:', request);

    this.activeRequestForMap = request;
  }

  loadActiveRescueTeams(): void {
    this.userRescueMapService.getActiveTeams().subscribe({
      next: (res: any) => {
        this.activeRescueTeams = res.teams || [];

        console.log('ACTIVE TEAMS:', this.activeRescueTeams);
      },
      error: (err) => {
        console.error('Lỗi lấy đội cứu hộ đang hoạt động:', err);
      }
    });
  }

  reloadRescueMap(): void {
    this.loadActiveRescueTeams();

    setTimeout(() => {
      this.userRescueMapComponent?.reloadMapData();
    }, 200);
  }

  // =========================
  // MỞ CHAT TỪ MAP
  // =========================

  openTeamChat(team: any): void {
    console.log('TEAM ĐƯỢC CHỌN:', team);

    this.selectedTeam = team;

    this.isTeamChatOpen = true;
  }

  closeTeamChat(): void {
    this.isTeamChatOpen = false;
    this.selectedTeam = null;
  }

  updateCurrentDateTime(): void {
    const now = new Date();

    const time = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const date = now.toLocaleDateString('vi-VN');

    this.currentDateTime = `${time} - ${date}`;
  }

  private updateWeather(data: Partial<typeof this.weather>): void {
    this.weather = {
      ...this.weather,
      ...data
    };

    this.cdr.detectChanges();
  }

  getCurrentUserLocation(): void {
    if (!navigator.geolocation) {
      this.updateWeather({
        condition: 'Trình duyệt không hỗ trợ GPS'
      });

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          this.loadWeather(latitude, longitude);
          this.loadCurrentCity(latitude, longitude);

          this.cdr.detectChanges();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          if (error.code === error.PERMISSION_DENIED) {
            this.updateWeather({
              condition: 'Bạn chưa cho phép truy cập vị trí'
            });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            this.updateWeather({
              condition: 'Không xác định được vị trí'
            });
          } else if (error.code === error.TIMEOUT) {
            this.updateWeather({
              condition: 'Lấy vị trí quá lâu'
            });
          } else {
            this.updateWeather({
              condition: 'Lỗi lấy vị trí'
            });
          }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  loadWeather(latitude: number, longitude: number): void {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&timezone=auto`;

    this.http.get<any>(weatherUrl).subscribe({
      next: (response) => {
        const current = response.current;

        this.ngZone.run(() => {
          this.weather = {
            city: 'Vị trí hiện tại',
            temperature: Math.round(current.temperature_2m).toString(),
            condition: this.getWeatherText(current.weather_code),
            humidity: current.relative_humidity_2m.toString(),
            windSpeed: Math.round(current.wind_speed_10m).toString(),
            warning: this.getWarningText(current.weather_code)
          };

          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.updateWeather({
            condition: 'Không tải được thời tiết'
          });
        });
      }
    });
  }

  loadCurrentCity(latitude: number, longitude: number): void {
    const geoUrl =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&localityLanguage=vi`;

    this.http.get<any>(geoUrl).subscribe({
      next: (res) => {
        const city =
          res.city ||
          res.locality ||
          res.principalSubdivision ||
          res.countryName ||
          'Vị trí hiện tại';

        this.weather.city = city;

        this.cdr.detectChanges();
      },
      error: () => {
        this.weather.city = 'Vị trí hiện tại';

        this.cdr.detectChanges();
      }
    });
  }

  getWeatherText(code: number): string {
    if (code === 0) return 'Trời quang';
    if ([1, 2, 3].includes(code)) return 'Có mây';
    if ([45, 48].includes(code)) return 'Sương mù';
    if ([51, 53, 55].includes(code)) return 'Mưa phùn';
    if ([61, 63, 65].includes(code)) return 'Có mưa';
    if ([80, 81, 82].includes(code)) return 'Mưa rào';
    if ([95, 96, 99].includes(code)) return 'Dông bão';

    return 'Đang cập nhật';
  }

  getWarningText(code: number): string {
    if ([61, 63, 65, 80, 81, 82].includes(code)) {
      return 'Nguy cơ ngập';
    }

    if ([95, 96, 99].includes(code)) {
      return 'Dông bão';
    }

    return 'Bình thường';
  }

  logout(): void {
    Swal.fire({
      title: 'Đăng xuất?',
      text: 'Bạn có chắc muốn đăng xuất khỏi hệ thống?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đăng xuất',
      cancelButtonText: 'Hủy',

      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',

      width: '360px',
      padding: '22px'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.loginService.logout().subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đăng xuất thành công',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });

          this.router.navigate(['/login']);
        },

        error: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không thể đăng xuất',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });
        }
      });
    });
  }

  toggleRequestHistory(): void {
    this.isRequestHistoryOpen = !this.isRequestHistoryOpen;
  }

  toggleGuide(): void {
    this.isGuideOpen = !this.isGuideOpen;
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }

  toggleEmergency(): void {
    this.isEmergencyOpen = !this.isEmergencyOpen;
  }

  toggleDetailed(): void {
    this.isDetailedOpen = !this.isDetailedOpen;
  }

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }
}