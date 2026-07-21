import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  AdminRescueTeamService
} from '../../../../services/admin-rescue-team/admin-rescue-team.service';

@Component({
  selector: 'app-admin-rescue-team-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-rescue-team-management.component.html',
  styleUrl: './admin-rescue-team-management.component.css'
})
export class AdminRescueTeamManagementComponent implements OnInit {

  teams: any[] = [];
  filteredTeams: any[] = [];

  searchText = '';
  isLoading = false;
  isDetailLoading = false;

  selectedTeam: any = null;

     isUpdateOpen = false;
   updateModel: any = null;


isCreateOpen = false;

createModel: any = {
  rescueTeamId: '',
  teamName: '',
  memberCount: 1,
  contactPhone: '',
  province: '',
  district: '',
  description: '',
  latitude: 0,
  longitude: 0,

  fullName: '',
  userName: '',
  email: '',
  phoneNumber: '',
  address: '',
  password: ''
};


openCreate(): void {
  this.createModel = {
    rescueTeamId: '',
    teamName: '',
    memberCount: 1,
    contactPhone: '',
    province: '',
    district: '',
    description: '',
    latitude: 0,
    longitude: 0,

    fullName: '',
    userName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: ''
  };

  this.isCreateOpen = true;
}

closeCreate(): void {
  this.isCreateOpen = false;
}

submitCreate(): void {
  this.adminRescueTeamService
    .createRescueTeamWithAccount(this.createModel)
    .subscribe({
      next: () => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Tạo đội cứu hộ và tài khoản thành công',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true
        });

        this.closeCreate();
        this.loadRescueTeams();
      },
      error: (err) => {
        console.error(err);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title:
            err?.error?.message ||
            'Không thể tạo đội cứu hộ và tài khoản',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }
    });
}





  constructor(
    private adminRescueTeamService: AdminRescueTeamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRescueTeams();
  }

  loadRescueTeams(): void {
    this.isLoading = true;

    this.adminRescueTeamService
      .getRescueTeamAccounts()
      .subscribe({
        next: (res: any) => {
          this.teams = Array.isArray(res)
            ? res
            : res.data || [];

          this.filteredTeams = [...this.teams];

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Lỗi load tài khoản đội cứu hộ:', err);

          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSearch(): void {
    const keyword =
      this.searchText.trim().toLowerCase();

    if (!keyword) {
      this.filteredTeams = [...this.teams];
      return;
    }

    this.filteredTeams = this.teams.filter(item =>
      item.fullName?.toLowerCase().includes(keyword) ||
      item.userName?.toLowerCase().includes(keyword) ||
      item.email?.toLowerCase().includes(keyword) ||
      item.phoneNumber?.toLowerCase().includes(keyword) ||
      item.address?.toLowerCase().includes(keyword) ||
      item.rescueTeamId?.toLowerCase().includes(keyword)
    );
  }

  openDetail(item: any): void {
    if (!item.rescueTeamId) {
      alert('Tài khoản này chưa có RescueTeamId.');
      return;
    }

    this.isDetailLoading = true;
    this.selectedTeam = null;

    this.adminRescueTeamService
      .getRescueTeamDetail(item.rescueTeamId)
      .subscribe({
        next: (res: any) => {
          this.selectedTeam = res;

          this.isDetailLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Lỗi lấy chi tiết đội cứu hộ:', err);

          this.isDetailLoading = false;
          alert('Không thể lấy chi tiết đội cứu hộ.');
          this.cdr.detectChanges();
        }
      });
  }

  closeDetail(): void {
    this.selectedTeam = null;
    this.isDetailLoading = false;
  }

 deleteTeamAccount(id: string): void {
  Swal.fire({
    icon: 'warning',
    title: 'Xóa đội cứu hộ?',
    text: 'Hành động này sẽ xóa cả tài khoản đăng nhập và thông tin đội cứu hộ.',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy',
    confirmButtonColor: '#dc2626'
  }).then((result) => {
    if (!result.isConfirmed) {
      return;
    }

    this.adminRescueTeamService
      .deleteRescueTeamAccount(id)
      .subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã xóa tài khoản và đội cứu hộ',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });

          this.teams =
            this.teams.filter(x => x.id !== id);

          this.filteredTeams =
            this.filteredTeams.filter(x => x.id !== id);

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Lỗi xóa:', err);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title:
              err?.error?.message ||
              'Không thể xóa tài khoản và đội cứu hộ',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
        }
      });
  });
}

  getStatusText(status: number | null | undefined): string {
    switch (status) {
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

  getStatusClass(status: number | null | undefined): string {
    switch (status) {
      case 2:
        return 'status-active';
      case 1:
        return 'status-break';
      case 0:
        return 'status-stop';
      default:
        return 'status-unknown';
    }
    
  }


openUpdate(item: any): void {
  this.updateModel = {
    id: item.id,
    fullName: item.fullName || '',
    userName: item.userName || '',
    email: item.email || '',
    phoneNumber: item.phoneNumber || '',
    address: item.address || ''
  };

  this.isUpdateOpen = true;
}

closeUpdate(): void {
  this.isUpdateOpen = false;
  this.updateModel = null;
}


submitUpdate(): void {

  if (!this.updateModel?.id) {
    return;
  }

  this.adminRescueTeamService
    .updateRescueTeamAccount(
      this.updateModel.id,
      {
        fullName: this.updateModel.fullName,
        userName: this.updateModel.userName,
        email: this.updateModel.email,
        phoneNumber: this.updateModel.phoneNumber,
        address: this.updateModel.address
      }
    )
    .subscribe({
      next: () => {

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Cập nhật tài khoản đội cứu hộ thành công',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true
        });

        this.closeUpdate();
        this.loadRescueTeams();
      },

      error: (err) => {

        console.error(err);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title:
            err?.error?.message ||
            'Không thể cập nhật tài khoản đội cứu hộ',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }
    });
}

}