import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import Swal from 'sweetalert2';

import {
  AdminAccountService
} from '../../../../services/admin-rescue-team/admin-account.service';

@Component({
  selector: 'app-admin-account-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-account-management.component.html',
  styleUrl: './admin-account-management.component.css'
})
export class AdminAccountManagementComponent implements OnInit {

  admins: any[] = [];
  filteredAdmins: any[] = [];

  searchText = '';
  isLoading = false;
  isCreateOpen = false;

  selectedAdmin: any = null;

  createModel = {
    fullName: '',
    userName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    roleName: 'Admin'
  };



isUpdateOpen = false;
updateModel: any = null;

openUpdate(item: any): void {
  this.updateModel = {
    id: item.id,
    fullName: item.fullName || '',
    userName: item.userName || '',
    email: item.email || '',
    phoneNumber: item.phoneNumber || '',
    address: item.address || '',
    password: ''
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

  this.adminService
    .updateAdminAccount(
      this.updateModel.id,
      {
        fullName: this.updateModel.fullName,
        userName: this.updateModel.userName,
        email: this.updateModel.email,
        phoneNumber: this.updateModel.phoneNumber,
        address: this.updateModel.address,
        password: this.updateModel.password
      }
    )
    .subscribe({
      next: () => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Cập nhật tài khoản quản trị thành công',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true
        });

        this.closeUpdate();
        this.loadAdmins();
      },

      error: (err) => {
        console.error('Lỗi cập nhật admin:', err);

        let errorMessage = 'Không thể cập nhật tài khoản quản trị';

        if (err?.error?.message) {
          errorMessage = err.error.message;
        }

        if (err?.error?.errors?.length > 0) {
          errorMessage = err.error.errors.join(' | ');
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: errorMessage,
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });
      }
    });
}

deleteAdminAccount(item: any): void {
  Swal.fire({
    icon: 'warning',
    title: 'Xóa tài khoản quản trị?',
    text: `Bạn có chắc muốn xóa tài khoản ${item.userName}?`,
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy',
    confirmButtonColor: '#dc2626'
  }).then((result) => {
    if (!result.isConfirmed) {
      return;
    }

    this.adminService
      .deleteAdminAccount(item.id)
      .subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã xóa tài khoản quản trị',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });

          this.admins =
            this.admins.filter(x => x.id !== item.id);

          this.filteredAdmins =
            this.filteredAdmins.filter(x => x.id !== item.id);
        },

        error: (err) => {
          console.error('Lỗi xóa admin:', err);

          let errorMessage = 'Không thể xóa tài khoản quản trị';

          if (err?.error?.message) {
            errorMessage = err.error.message;
          }

          if (err?.error?.errors?.length > 0) {
            errorMessage = err.error.errors.join(' | ');
          }

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: errorMessage,
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
          });
        }
      });
  });
}


  constructor(
    private adminService: AdminAccountService
  ) {}

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.isLoading = true;

    this.adminService
      .getAdminAccounts()
      .subscribe({
        next: (res) => {
          this.admins = Array.isArray(res) ? res : [];
          this.filteredAdmins = [...this.admins];
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không thể tải danh sách quản trị viên',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      });
  }

  onSearch(): void {
    const keyword = this.searchText.trim().toLowerCase();

    if (!keyword) {
      this.filteredAdmins = [...this.admins];
      return;
    }

    this.filteredAdmins = this.admins.filter(item =>
      item.fullName?.toLowerCase().includes(keyword) ||
      item.userName?.toLowerCase().includes(keyword) ||
      item.email?.toLowerCase().includes(keyword) ||
      item.phoneNumber?.toLowerCase().includes(keyword) ||
      item.roleName?.toLowerCase().includes(keyword)
    );
  }

  openDetail(item: any): void {
    this.selectedAdmin = item;
  }

  closeDetail(): void {
    this.selectedAdmin = null;
  }

  openCreate(): void {
    this.isCreateOpen = true;
  }

  closeCreate(): void {
    this.isCreateOpen = false;

    this.createModel = {
      fullName: '',
      userName: '',
      email: '',
      phoneNumber: '',
      address: '',
      password: '',
      roleName: 'Admin'
    };
  }

  submitCreate(): void {
    this.adminService
      .createAdminAccount(this.createModel)
      .subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Tạo tài khoản quản trị thành công',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });

          this.closeCreate();
          this.loadAdmins();
        },

        error: (err) => {
          console.error('Lỗi tạo admin:', err);

          let errorMessage = 'Không thể tạo tài khoản quản trị';

          if (err?.error?.message) {
            errorMessage = err.error.message;
          }

          if (err?.error?.errors?.length > 0) {
            errorMessage = err.error.errors.join(' | ');
          }

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: errorMessage,
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
          });
        }
      });
  }

  getRoleClass(roleName: string): string {
    return roleName === 'SuperAdmin'
      ? 'super-admin'
      : 'admin';
  }
}