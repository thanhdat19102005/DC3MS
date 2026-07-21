import { Component, OnInit, EventEmitter,Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RescueTeamService } from '../../../../services/rescue-team/rescue-team.service';
import { environment } from '../../../../environments/environment.development';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-rescue-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rescue-settings.component.html',
  styleUrls: ['./rescue-settings.component.css']
})
export class RescueSettingsComponent implements OnInit {

  teamInfo: any = {
    Id: '',
    TeamName: '',
    ContactPhone: '',
    MemberCount: 0,
    Province: '',
    District: '',
    Description: '',
   Status: 2

  };

  accountInfo = {
    email: ''
  };


  @Output() statusChanged = new EventEmitter<number>();
  teamAvatar: string | null = null;
  selectedAvatarFile: File | null = null;

  // Ngày thành lập chỉ để hiển thị
  foundedDate: string = '';

  security = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  notificationSettings = {
    newRequest: true,
    assignedRequest: true,
    statusUpdated: true,
    systemAlert: false
  };

  systemSettings = {
    language: 'Tiếng Việt',
    theme: 'Sáng',
    refreshTime: '30 giây',
    sound: true
  };

  constructor(
    private rescueTeamService: RescueTeamService
  ) {}

  ngOnInit(): void {
    this.loadTeamProfile();
  }

  loadTeamProfile() {
    this.rescueTeamService.getMyTeamProfile().subscribe({
      next: (res) => {
        this.teamInfo = {
          Id: res.team?.id || '',
          TeamName: res.team?.teamName || '',
          ContactPhone: res.team?.contactPhone || '',
          MemberCount: res.team?.memberCount || 0,
          Province: res.team?.province || '',
          District: res.team?.district || '',
          Description: res.team?.description || '',
           Status: res.team?.status ?? 2
        };

        this.accountInfo.email = res.account?.email || '';

        this.foundedDate = res.team?.createdAt
          ? new Date(res.team.createdAt).toISOString().split('T')[0]
          : '';

        this.teamAvatar = res.team?.avatarUrl
          ? `${environment.apiUrl}/teamAvatars/${res.team.avatarUrl}`
          : null;
      },
      error: (err) => {
        console.error('Lỗi load thông tin đội:', err);
      }
    });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    this.selectedAvatarFile = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.teamAvatar = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  saveTeamInfo() {
    if (!this.teamInfo.Id) {
      Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: 'Không tìm thấy mã đội cứu hộ',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    iconColor: '#dc2626',
    color: '#334155',
    background: '#ffffff',
    customClass: {
      popup: 'rescue-toast',
      timerProgressBar: 'rescue-toast-progress'
    }
  });

      return;
    }

    this.rescueTeamService
      .updateTeamInfo(
        this.teamInfo.Id,
        this.teamInfo,
        this.selectedAvatarFile
      )
      .subscribe({
        next: () => {

  this.statusChanged.emit(this.teamInfo.Status);



       Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'Lưu thông tin đội thành công',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    iconColor: '#dc2626',
    color: '#334155',
    background: '#ffffff',
    customClass: {
      popup: 'rescue-toast',
      timerProgressBar: 'rescue-toast-progress'
    }
  });
          this.selectedAvatarFile = null;
          this.loadTeamProfile();
        },
        error: (err) => {
      console.error('Lỗi cập nhật đội:', err);
    Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: 'Cập nhật thông tin đội thất bại',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    iconColor: '#dc2626',
    color: '#334155',
    background: '#ffffff',
    customClass: {
      popup: 'rescue-toast',
      timerProgressBar: 'rescue-toast-progress'
    }
  });
        }
      });
  }

  saveSecurityInfo() {
 this.rescueTeamService.changePassword(
  this.security.currentPassword,
  this.security.newPassword,
  this.security.confirmPassword
).subscribe({
  next: (res) => {

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: res.message,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });

    this.security = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  },

  error: (err) => {

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: err.error?.message || 'Đổi mật khẩu thất bại',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  }
});
  }

  exportData() {
    alert('Đang xuất dữ liệu...');
  }

  importData() {
    alert('Đang nhập dữ liệu...');
  }

  deleteData() {
    const confirmDelete = confirm('Bạn có chắc muốn xóa dữ liệu không?');

    if (confirmDelete) {
      alert('Đã xóa dữ liệu mẫu!');
    }
  }

  logoutAllDevices() {
    alert('Đã đăng xuất tất cả thiết bị!');
  }
}