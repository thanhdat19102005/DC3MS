import {
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import Swal from 'sweetalert2';

import {
  environment
} from '../../../../environments/environment.development';

import {
  UserSettingsService
} from '../../../../services/user/settings/user-settings.service';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css'
})
export class UserSettingsComponent implements OnInit {

  @Output()
  closeSettings = new EventEmitter<void>();

  // =========================
  // TRẠNG THÁI LOADING
  // =========================

  isLoadingProfile = false;
  isSavingProfile = false;
  isChangingPassword = false;

  // =========================
  // FILE AVATAR ĐƯỢC CHỌN
  // =========================

  selectedAvatarFile: File | null = null;

  // =========================
  // DỮ LIỆU USER HIỂN THỊ TRÊN FORM
  // =========================

  user = {
    fullName: '',
    phone: '',
    email: '',
    address: '',
    avatarUrl: ''
  };

  // =========================
  // DỮ LIỆU ĐỔI MẬT KHẨU
  // =========================

  password = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // =========================
  // ẨN / HIỆN MẬT KHẨU
  // =========================

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private userSettingsService: UserSettingsService
  ) {}

  // =========================
  // KHI COMPONENT ĐƯỢC MỞ
  // =========================

  ngOnInit(): void {
    this.loadProfile();
  }

  // =====================================
  // LOAD PROFILE USER TỪ API
  // =====================================

  loadProfile(): void {
    this.isLoadingProfile = true;

    this.userSettingsService
      .getProfile()
      .subscribe({

        next: (res: any) => {

          this.user = {
            fullName: res.fullName || '',
            phone: res.phoneNumber || '',
            email: res.email || '',
            address: res.address || '',
            avatarUrl: this.buildAvatarUrl(res.avatarUrl)
          };

          this.isLoadingProfile = false;
        },

        error: (err) => {

          console.error(err);

          this.isLoadingProfile = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Không tải được thông tin tài khoản',
            showConfirmButton: false,
            timer: 1800,
            timerProgressBar: true
          });
        }

      });
  }

  // =====================================
  // BUILD URL ẢNH AVATAR
  // Nếu DB chỉ lưu tên file thì nối thêm domain backend
  // =====================================

  private buildAvatarUrl(
    avatarUrl: string | null | undefined
  ): string {

    if (!avatarUrl) {
      return 'assets/images/default-avatar.png';
    }

    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    const cleanAvatarUrl = avatarUrl.startsWith('/')
      ? avatarUrl.substring(1)
      : avatarUrl;

    return `${environment.apiUrl}/userAvatars/${cleanAvatarUrl}`;
  }

  // =====================================
  // CHỌN ẢNH AVATAR + PREVIEW ẢNH
  // =====================================

  onAvatarSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const file =
      input.files[0];

    // Giới hạn ảnh tối đa 2MB
    if (
      file.size >
      2 * 1024 * 1024
    ) {

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Ảnh không được vượt quá 2MB',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });

      input.value = '';
      return;
    }

    this.selectedAvatarFile = file;

    // Preview ảnh trước khi upload
    const reader =
      new FileReader();

    reader.onload = () => {
      this.user.avatarUrl =
        reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  // =====================================
  // CẬP NHẬT PROFILE USER
  // =====================================

  saveProfile(): void {

    // Validate dữ liệu bắt buộc
    if (
      !this.user.fullName ||
      !this.user.phone ||
      !this.user.address
    ) {

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Vui lòng nhập đầy đủ thông tin',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });

      return;
    }

    // Vì có upload ảnh nên dùng FormData
    const formData =
      new FormData();

    formData.append(
      'fullName',
      this.user.fullName
    );

    formData.append(
      'phoneNumber',
      this.user.phone
    );

    formData.append(
      'address',
      this.user.address
    );

    // Nếu user có chọn avatar mới thì gửi file lên backend
    if (this.selectedAvatarFile) {

      formData.append(
        'fileAttachments',
        this.selectedAvatarFile
      );

    }

    this.isSavingProfile = true;

    this.userSettingsService
      .updateProfile(formData)
      .subscribe({

        next: (res: any) => {

          const data =
            res.data || res;

          // Cập nhật lại dữ liệu mới backend trả về
          this.user = {
            fullName:
              data.fullName || this.user.fullName,

            phone:
              data.phoneNumber || this.user.phone,

            email:
              data.email || this.user.email,

            address:
              data.address || this.user.address,

            avatarUrl:
              this.buildAvatarUrl(data.avatarUrl)
          };

          this.selectedAvatarFile = null;
          this.isSavingProfile = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title:
              res.message ||
              'Cập nhật thành công',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });

        },

        error: (err) => {

          console.error(err);

          this.isSavingProfile = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title:
              err.error?.message ||
              'Không thể cập nhật',
            showConfirmButton: false,
            timer: 1800,
            timerProgressBar: true
          });

        }

      });
  }

  // =====================================
  // ĐỔI MẬT KHẨU USER
  // =====================================

  changePassword(): void {

    // Kiểm tra nhập đủ 3 ô
    if (
      !this.password.currentPassword ||
      !this.password.newPassword ||
      !this.password.confirmPassword
    ) {

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Vui lòng nhập đủ thông tin',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });

      return;
    }

    // Kiểm tra mật khẩu mới và xác nhận phải giống nhau
    if (
      this.password.newPassword !==
      this.password.confirmPassword
    ) {

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Mật khẩu xác nhận không khớp',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });

      return;
    }

    // Không cho đổi trùng mật khẩu cũ
    if (
      this.password.currentPassword ===
      this.password.newPassword
    ) {

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Mật khẩu mới phải khác mật khẩu hiện tại',
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true
      });

      return;
    }

    const data = {
      currentPassword:
        this.password.currentPassword,

      newPassword:
        this.password.newPassword,

      confirmPassword:
        this.password.confirmPassword
    };

    this.isChangingPassword = true;

    this.userSettingsService
      .changePassword(data)
      .subscribe({

        next: (res: any) => {

          this.isChangingPassword = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title:
              res.message ||
              'Đổi mật khẩu thành công',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });

          // Xóa dữ liệu trong form sau khi đổi thành công
          this.password = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };

        },

        error: (err) => {

          console.error(err);

          this.isChangingPassword = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title:
              err.error?.message ||
              'Không thể đổi mật khẩu',
            showConfirmButton: false,
            timer: 2200,
            timerProgressBar: true
          });

        }

      });
  }

  // =====================================
  // ĐÓNG MODAL SETTINGS
  // =====================================

  close(): void {
    this.closeSettings.emit();
  }

}