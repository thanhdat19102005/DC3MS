import { CommonModule } from '@angular/common';
import { Component, OnInit  , OnDestroy,ChangeDetectorRef   } from '@angular/core';

import {
  AdminRescueTeamManagementComponent
} from './admin-rescue-team-management/admin-rescue-team-management.component';

import {
  AdminAccountManagementComponent
} from './admin-account-management/admin-account-management.component';

import {
  AdminRescueTeamService
} from '../../../services/admin-rescue-team/admin-rescue-team.service';


import {
  AdminRescueContactMapComponent
} from './admin-rescue-contact-map/admin-rescue-contact-map.component';


import {
  AdminSmsRescueComponent
} from './admin-sms-rescue/admin-sms-rescue.component';

import { Router } from '@angular/router';
import { LoginService } from '../../../services/auth/login.service';

import Swal from 'sweetalert2';

import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AdminRescueTeamManagementComponent,
    AdminAccountManagementComponent,
    AdminRescueContactMapComponent,
    AdminSmsRescueComponent
    
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  adminName = 'Super Admin';

  sidebarExpanded = false;
  sidebarPinned = false;

  activeMenu:
    | 'users'
    | 'teams'
    | 'admins'
    | 'news'
    | 'notifications'
    | 'stats'
    | 'rescue-rate'
    | 'reports'
    |'rescue-contact'
    | 'settings'
    | 'roles'
    | 'logs'
    | 'sms-rescue'
    = 'stats';

  teamStatistics: any[] = [];
  isStatisticsLoading = false;
  statisticsError = '';

 currentDateTime = '';
private clockInterval: any;



  constructor(
    private adminRescueTeamService: AdminRescueTeamService ,
      private cdr: ChangeDetectorRef,
        private loginService: LoginService,
  private router: Router

  ) {}

ngOnInit(): void {
  this.loadStatistics();

  this.updateCurrentDateTime();

  this.clockInterval = setInterval(() => {
    this.updateCurrentDateTime();
    this.cdr.detectChanges();
  }, 1000);
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

ngOnDestroy(): void {
  if (this.clockInterval) {
    clearInterval(this.clockInterval);
  }
}

logoutSystem(): void {
  Swal.fire({
    title: 'Đăng xuất hệ thống?',
    text: 'Bạn có chắc muốn đăng xuất khỏi hệ thống không?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Đăng xuất',
    cancelButtonText: 'Hủy',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b'
  }).then((result) => {
    if (result.isConfirmed) {
      this.loginService.logout().subscribe({
        next: () => {
          localStorage.clear();
          sessionStorage.clear();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đăng xuất thành công',
            showConfirmButton: false,
            timer: 1500
          });

          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Lỗi đăng xuất:', err);

          localStorage.clear();
          sessionStorage.clear();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã đăng xuất khỏi hệ thống',
            showConfirmButton: false,
            timer: 1500
          });

          this.router.navigate(['/login']);
        }
      });
    }
  });
}



  loadStatistics(): void {
    this.isStatisticsLoading = true;
    this.statisticsError = '';

    this.adminRescueTeamService
      .getRescueTeamRequestStatistics()
      .subscribe({
        next: (res) => {
          this.teamStatistics = Array.isArray(res) ? res : [];
          this.isStatisticsLoading = false;
        },
        error: (err) => {
          console.error('Lỗi load thống kê:', err);
          this.statisticsError = 'Không thể tải dữ liệu thống kê.';
          this.isStatisticsLoading = false;
        }
      });
  }


exportRescueRateExcel(): void {
  const data = this.teamStatistics.map(item => ({
    'Đội cứu hộ': item.teamName || item.rescueTeamId,
    'Mã đội': item.rescueTeamId,
    'Tổng yêu cầu': item.totalRequests || 0,
    'Chờ xử lý': item.pendingRequests || 0,
    'Đang cứu hộ': item.processingRequests || 0,
    'Hoàn thành': item.completedRequests || 0,
    'Đã hủy': item.canceledRequests || 0,
    'Người cần cứu trợ': item.totalPeopleNeedHelp || 0,
    'Tỉ lệ hoàn thành': `${this.getTeamCompletionRate(item)}%`
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ti le cuu ho');

  XLSX.writeFile(workbook, 'ti-le-cuu-ho-theo-doi.xlsx');
}



  get totalRequests(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.totalRequests || 0),
      0
    );
  }

  get totalPendingRequests(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.pendingRequests || 0),
      0
    );
  }

  get totalProcessingRequests(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.processingRequests || 0),
      0
    );
  }

  get totalCompletedRequests(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.completedRequests || 0),
      0
    );
  }

  get totalCanceledRequests(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.canceledRequests || 0),
      0
    );
  }

  get totalPeopleNeedHelp(): number {
    return this.teamStatistics.reduce(
      (sum, item) => sum + (item.totalPeopleNeedHelp || 0),
      0
    );
  }

  get completionRate(): number {
    if (this.totalRequests === 0) {
      return 0;
    }

    return Math.round(
      (this.totalCompletedRequests / this.totalRequests) * 100
    );
  }

  get averageResponseMinutes(): number {
    const validItems = this.teamStatistics.filter(
      item => item.averageResponseMinutes && item.averageResponseMinutes > 0
    );

    if (validItems.length === 0) {
      return 0;
    }

    const total = validItems.reduce(
      (sum, item) => sum + item.averageResponseMinutes,
      0
    );

    return Math.round(total / validItems.length);
  }

  getPercent(value: number): number {
    if (this.totalRequests === 0) {
      return 0;
    }

    return Math.round((value / this.totalRequests) * 100);
  }

  getTeamCompletionRate(item: any): number {
    if (!item?.totalRequests) {
      return 0;
    }

    return Math.round(
      ((item.completedRequests || 0) / item.totalRequests) * 100
    );
  }

  toggleSidebar(): void {
    this.sidebarPinned = !this.sidebarPinned;
  }

  expandSidebar(): void {
    if (!this.sidebarPinned) {
      this.sidebarExpanded = true;
    }
  }

  collapseSidebar(): void {
    if (!this.sidebarPinned) {
      this.sidebarExpanded = false;
    }
  }

  switchMenu(menu: typeof this.activeMenu): void {
    this.activeMenu = menu;

    if (menu === 'stats' || menu === 'rescue-rate') {
      this.loadStatistics();
    }
  }
}