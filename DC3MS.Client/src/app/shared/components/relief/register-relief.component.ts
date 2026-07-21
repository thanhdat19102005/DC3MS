import { Component, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RegisterReliefService } from '../../../../app/services/relief/register-relief.service'; // 
import Swal from 'sweetalert2';
@Component({
  selector: 'app-register-relief',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-relief.component.html',
  styleUrl: './register-relief.component.css'
})
export class RegisterReliefComponent { // Thêm OnInit để load user ngầm
  // --- THÊM MỚI: Định nghĩa 2 sự kiện để truyền dữ liệu ra component cha ---
  formSubmitted = output<{ phoneNumber: string; address: string }>();
  formClosed = output<void>();
 isSending = signal(false);
  // --- THÊM MỚI: Khai báo các trường vào form trống cũ của bạn ---
  reliefForm = new FormGroup({
    phoneNumber: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
    address: new FormControl('', [Validators.required, Validators.minLength(5)])
  });


// TIÊM SERVICE VÀO CONSTRUCTOR ĐỂ SỬ DỤNG LỆNH GỬI API
  constructor(private registerReliefService: RegisterReliefService) {}





  // --- HÀM XỬ LÝ KHI NGƯỜI DÙNG NHẤN NÚT ĐĂNG KÝ NGAY ---
  onSubmit() {
    if (this.reliefForm.valid) {
      
      // Bật trạng thái đang xử lý gửi dữ liệu
      this.isSending.set(true);
      const data = this.reliefForm.value;

      // 🚀 GỌI SERVICE GỬI ĐẾN BACKEND CÓ ĐÍNH KÈM COOKIE JWT
      this.registerReliefService.postMessage(data).subscribe({
        next: (res) => {
          this.isSending.set(false);

          // 🎉 HIỂN THỊ TOAST THÀNH CÔNG GỌN ĐẸP TRÊN MOBILE
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Cập nhật thành công',
            text: res.message || 'Hồ sơ của bạn đã được bổ sung đầy đủ!',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });

          // Đẩy dữ liệu ra component cha (nếu cần) và đóng form
          this.formSubmitted.emit(data as { phoneNumber: string; address: string });
          this.onClose();
        },
        error: (err) => {
          this.isSending.set(false);
          console.error('❌ Lỗi lưu hồ sơ:', err);

          // 🔴 HIỂN THỊ TOAST THẤT BẠI HOẶC SẬP MẠNG
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Cập nhật thất bại',
            text: err.error?.message || 'Không thể kết nối đến máy chủ.',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
        }
      });

    } else {
      // Ép hiển thị các viền đỏ báo lỗi validate nếu người dân điền thiếu dữ liệu
      this.reliefForm.markAllAsTouched();
    }
  }

  // --- THÊM MỚI: Hàm đóng form khi click ngoài hoặc nút hủy ---
  onClose() {
    this.formClosed.emit();
  }
}