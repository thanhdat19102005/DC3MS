import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RescueTeamService } from '../../../services/rescue-team/rescue-team.service';
import { RescueDetailComponent } from './rescue-detail/rescue-detail.component';
import { environment } from '../../../environments/environment.development';

import { RescueSettingsComponent } from './rescue-settings/rescue-settings.component';
import {
  RescueTeamChatComponent
} from './rescue-team-chat/rescue-team-chat.component';
// ===== MAP COMPONENT CON =====
import { RescueMapComponent } from './rescue-map/rescue-map.component';

// ===== STATS COMPONENT CON =====
import { RescueStatsComponent } from './rescue-stats/rescue-stats.component';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-rescue-team',
  standalone: true,
  imports: [
    CommonModule,
    RescueDetailComponent,
    RescueMapComponent,
    RescueStatsComponent,
    RescueSettingsComponent,
    RescueTeamChatComponent
  ],
  templateUrl: './rescue-team.component.html',
  styleUrls: ['./rescue-team.component.css']
})
export class RescueTeamComponent implements OnInit , OnDestroy {
  requests: any[] = [];
  acceptedRequests: any[] = [];
  completedRequests: any[] = [];

  teamName: string = 'Đang tải...';


 
teamStatus: number = 2; // 0 = Ngừng hoạt động
                       // 1 = Tạm nghỉ
                       // 2 = Đang trực

// =========================
// HIỂN THỊ NGÀY GIỜ HIỆN TẠI TRÊN BANNER
// =========================
currentDateTime: string = '';

// Lưu interval để khi thoát component thì clear, tránh chạy ngầm
private clockInterval: any;

teamId: string = '';





  activeTab:
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'map'
    | 'stats'
    | 'settings'
    = 'pending';



isUserChatOpen = false;
selectedChatRequest: any = null;


openChatWithUser(request: any): void {
  console.log('Mở chat với user:', request);

  this.selectedChatRequest = request;
  this.isUserChatOpen = true;
}

closeUserChat(): void {
  this.isUserChatOpen = false;
  this.selectedChatRequest = null;
}





  // =========================
  // SIDEBAR
  // =========================

  // sidebar đang mở
  sidebarExpanded = false;

  // ghim sidebar
  sidebarPinned = false;

  toggleSidebar() {
    this.sidebarPinned = !this.sidebarPinned;
  }

  expandSidebar() {
    if (!this.sidebarPinned) {
      this.sidebarExpanded = true;
    }
  }

  collapseSidebar() {
    if (!this.sidebarPinned) {
      this.sidebarExpanded = false;
    }
  }


onStatusChanged(status: number) {
  this.teamStatus = status;
}


  // =========================
  // DỮ LIỆU CHO COMPONENT BẢN ĐỒ + THỐNG KÊ
  // Gộp request pending + accepted + completed
  // =========================
  mapRequests: any[] = [];

  // =========================
  // CẬP NHẬT DỮ LIỆU CHO BẢN ĐỒ + THỐNG KÊ
  // =========================
  updateMapRequests() {
    this.mapRequests = [
      ...this.requests,
      ...this.acceptedRequests,
      ...this.completedRequests
    ];
  }


  constructor(
    private rescueService: RescueTeamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ===== GIỮ LOGIC CŨ: vào trang load yêu cầu khẩn cấp trước =====
    this.loadTeamRequests();

 this.loadTeamProfile(); // thêm dòng này


    
  // ===== THÊM: HIỂN THỊ NGÀY GIỜ HIỆN TẠI TRÊN BANNER =====
  this.updateCurrentDateTime();

  this.clockInterval = setInterval(() => {
    this.updateCurrentDateTime();

    // ===== THÊM DÒNG NÀY ĐỂ UI CẬP NHẬT REALTIME =====
    this.cdr.detectChanges();

  }, 1000);
  }



loadTeamProfile() {
  this.rescueService.getMyTeamProfile().subscribe({
    next: (res) => {

      this.teamId = res.team?.id || '';

      this.teamName = res.team?.teamName || '';

      this.teamStatus = res.team?.status ?? 2;

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error(err);
    }
  });
}



getStatusText(): string {

  switch (this.teamStatus) {

    case 2:
      return 'Đang hoạt động';

    case 1:
      return 'Tạm nghỉ';

    case 0:
      return 'Ngừng hoạt động';

    default:
      return 'Không xác định';
  }
}

getStatusClass(): string {

  switch (this.teamStatus) {

    case 2:
      return 'status-active';

    case 1:
      return 'status-break';

    case 0:
      return 'status-stop';

    default:
      return '';
  }
}






// =========================
// FORMAT NGÀY GIỜ HIỆN TẠI
// Ví dụ: 28/05/2026 - 09:34:09
// =========================
updateCurrentDateTime() {
  const now = new Date();

  const time = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const date = now.toLocaleDateString('vi-VN');

  this.currentDateTime = `${time} - ${date}`;
}

// =========================
// CLEAR INTERVAL KHI RỜI COMPONENT
// =========================
ngOnDestroy(): void {
  if (this.clockInterval) {
    clearInterval(this.clockInterval);
  }
}




  switchTab(tab: 'pending' | 'accepted' | 'completed' | 'map' | 'stats' | 'settings') {
  this.activeTab = tab;

  if (tab === 'pending') {
    this.loadTeamRequests();
  } else if (tab === 'accepted') {
    this.loadAcceptedRequests();
  } else if (tab === 'completed') {
    this.loadCompletedRequests();
  } else if (tab === 'map' || tab === 'stats') {
    this.loadAllRequestsForDashboard();
  }
}

  loadAllRequestsForDashboard() {
    this.loadTeamRequests();
    this.loadAcceptedRequests();
    this.loadCompletedRequests();
  }

  // =========================
  // DETAIL MODAL
  // =========================
  isDetailOpen = false;
  selectedRequest: any = null;

  openDetail(id: number) {
    this.rescueService.getRequestDetail(id).subscribe({
      next: (res) => {
        console.log('DETAIL API:', res);

        this.selectedRequest = this.mapRequest(res);

        console.log('AFTER MAP:', this.selectedRequest);

        this.isDetailOpen = true;
      },
      error: (err) => {
        console.error('Lỗi lấy chi tiết:', err);
      }
    });
  }

  closeDetail() {
    this.isDetailOpen = false;
    this.selectedRequest = null;
  }

  // =========================
  // LOAD YÊU CẦU CHỜ XỬ LÝ
  // =========================
  loadTeamRequests() {
    this.teamName = 'Đang tải...';

    this.rescueService.getMyTeamRequests().subscribe({
      next: (res) => {
        if (res && res.requests) {
          this.teamName = res.teamName;
          this.requests = res.requests.map((req: any) => this.mapRequest(req));

          // ===== CẬP NHẬT MAP + THỐNG KÊ =====
          this.updateMapRequests();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi API:', err);
        this.teamName = 'Lỗi kết nối!';
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // LOAD YÊU CẦU ĐÃ NHẬN
  // =========================
  loadAcceptedRequests() {
    this.rescueService.getRescuingRequests().subscribe({
      next: (res) => {
        if (res && res.requests) {
          this.teamName = res.teamName;
          this.acceptedRequests = res.requests.map((req: any) => this.mapRequest(req));

          // ===== CẬP NHẬT MAP + THỐNG KÊ =====
          this.updateMapRequests();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi API accepted:', err);
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // LOAD YÊU CẦU ĐÃ HOÀN THÀNH
  // =========================
  loadCompletedRequests() {
    this.rescueService.getCompletedRequests().subscribe({
      next: (res) => {
        if (res && res.requests) {
          this.teamName = res.teamName;
          this.completedRequests = res.requests.map((req: any) => this.mapRequest(req));

          // ===== CẬP NHẬT MAP + THỐNG KÊ =====
          this.updateMapRequests();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi API completed:', err);
        this.cdr.detectChanges();
      }
    });
  }
private mapRequest(req: any) {
  return {
    id: req.id,

    rescueTeamId: req.rescueTeamId,

    createdAt: req.createdAt,
    completedAtRaw: req.completedAt,

    userName: req.senderName,
    type: req.rescueType,
    severity: req.urgencyLevel,
    healthStatus: req.healthStatus,
    content: req.content,
    people: req.peopleCount,
    hasChildren: req.hasChildren,
    hasElderly: req.hasElderly,
    isCritical: req.urgencyLevel === 'Nguy Kịch',
    phone: req.phoneNumber,
    alternativePhoneNumber: req.alternativePhoneNumber,
    status: req.status,
    latitude: req.latitude,
    longitude: req.longitude,

    mediaUrls: req.mediaPaths
      ? req.mediaPaths
          .split(',')
          .map((x: string) =>
            `${environment.apiUrl}/rescueImages/${x.trim()}`
          )
      : [],

    time: req.createdAt
      ? new Date(req.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Không xác định',

    distance: req.distance
      ? req.distance.toFixed(1) + ' Km'
      : '0 Km',

    completedAt: req.completedAt
      ? new Date(req.completedAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        })
      : null
  };
}

  onRefresh() {
    if (this.activeTab === 'pending') {
      this.loadTeamRequests();
    } else if (this.activeTab === 'accepted') {
      this.acceptedRequests = [];
      this.loadAcceptedRequests();
    } else if (this.activeTab === 'completed') {
      this.completedRequests = [];
      this.loadCompletedRequests();
    } else if (this.activeTab === 'map' || this.activeTab === 'stats') {
      // ===== THÊM: refresh map / thống kê thì load đủ dữ liệu =====
      this.loadAllRequestsForDashboard();
    }
  }

  onAccept(requestId: number) {
    Swal.fire({
      icon: 'warning',
      title: 'Nhận hỗ trợ yêu cầu này?',
      text: 'Yêu cầu sẽ được chuyển sang danh sách đã nhận.',
      showCancelButton: true,
      confirmButtonText: 'Nhận hỗ trợ',
      cancelButtonText: 'Quay lại',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#3085d6',
      customClass: {
        popup: 'swal-cancel-popup',
        title: 'swal-cancel-title',
        htmlContainer: 'swal-cancel-text',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.rescueService.acceptRequest(requestId).subscribe({
        next: () => {
          const accepted = this.requests.find(r => r.id === requestId);

          this.requests = this.requests.filter(r => r.id !== requestId);

          if (accepted) {
            accepted.status = 1;
            this.acceptedRequests.unshift(accepted);
          }

          // ===== THÊM: CẬP NHẬT MAP + THỐNG KÊ SAU KHI NHẬN =====
          this.updateMapRequests();

          this.cdr.detectChanges();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã nhận hỗ trợ!',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (err) => {
          console.error('Lỗi nhận hỗ trợ:', err);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không thể nhận hỗ trợ!',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      });
    });
  }

  onComplete(requestId: number) {
    Swal.fire({
      icon: 'warning',
      title: 'Hoàn thành cứu hộ?',
      text: 'Yêu cầu này sẽ được chuyển sang danh sách đã hoàn thành.',
      showCancelButton: true,
      confirmButtonText: 'Hoàn thành',
      cancelButtonText: 'Quay lại',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#3085d6',
      customClass: {
        popup: 'swal-cancel-popup',
        title: 'swal-cancel-title',
        htmlContainer: 'swal-cancel-text',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.rescueService.completeRequest(requestId).subscribe({
        next: () => {
          const completed = this.acceptedRequests.find(r => r.id === requestId);

          this.acceptedRequests = this.acceptedRequests.filter(r => r.id !== requestId);

          if (completed) {
            completed.status = 2;

            // ===== THÊM/SỬA: LƯU THỜI GIAN HOÀN THÀNH GỐC =====
            // Dòng này giúp component thống kê tính avgProcessTime
            const now = new Date();
            completed.completedAtRaw = now;

            // ===== GIỮ HIỂN THỊ THỜI GIAN HOÀN THÀNH TRÊN CARD =====
            completed.completedAt = now.toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            });

            this.completedRequests.unshift(completed);
          }

          // ===== THÊM: CẬP NHẬT MAP + THỐNG KÊ SAU KHI HOÀN THÀNH =====
          this.updateMapRequests();

          this.cdr.detectChanges();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã hoàn thành cứu hộ!',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (err) => {
          console.error('Lỗi hoàn thành:', err);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không thể hoàn thành yêu cầu!',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      });
    });
  }

  onCancel(requestId: number, tab: 'pending' | 'accepted' | 'completed') {
    Swal.fire({
      icon: 'warning',
      title: 'Xóa yêu cầu cứu hộ?',
      text: 'Hành động này sẽ xóa yêu cầu khỏi danh sách hiện tại.',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Quay lại',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#3085d6',
      reverseButtons: false,
      customClass: {
        popup: 'swal-cancel-popup',
        title: 'swal-cancel-title',
        htmlContainer: 'swal-cancel-text',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.rescueService.cancelRequest(requestId).subscribe({
        next: () => {
          if (tab === 'pending') {
            this.requests = this.requests.filter(r => r.id !== requestId);
          } else if (tab === 'accepted') {
            this.acceptedRequests = this.acceptedRequests.filter(r => r.id !== requestId);
          } else {
            this.completedRequests = this.completedRequests.filter(r => r.id !== requestId);
          }

          // ===== THÊM: CẬP NHẬT MAP + THỐNG KÊ SAU KHI HỦY/XÓA =====
          this.updateMapRequests();

          this.cdr.detectChanges();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã xóa yêu cầu cứu hộ!',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (err) => {
          console.error('Lỗi xóa yêu cầu:', err);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không thể xóa yêu cầu!',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      });
    });
  }

  onLogout() {
    this.rescueService.logout().subscribe({
      next: () => { window.location.href = '/login'; },
      error: () => { window.location.href = '/login'; }
    });
  }
}