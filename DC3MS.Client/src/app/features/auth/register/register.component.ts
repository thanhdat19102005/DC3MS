import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import {RegisterViewModel} from './type/register';

import { RegisterService } from '../../../services/auth/register.service';



import Swal from 'sweetalert2';
import e from 'express';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isSubmitted = false; // Biến đánh dấu đã nhấn nút Submit

  public registerData : RegisterViewModel = {
  fullName: '',
  phoneNumber: '',
  email: '',
  password: '',
  address: ''
};




  constructor(private router: Router, private registerService: RegisterService) {}

  ngOnInit(): void {
    this.registerForm = new FormGroup({
      fullName: new FormControl('', [Validators.required]),
      phoneNumber: new FormControl('', [
        Validators.required, 
        Validators.pattern('^(0|84)[3|5|7|8|9][0-9]{8}$') 
      ]),
      email: new FormControl('', [Validators.required, Validators.email]),
      address: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', [Validators.required])
    }, { validators: this.passwordMatchValidator }); // Thêm validator so sánh password và confirmPassword vào FormGroup
  }
  
 // control trong hàm thực chất chính là this.registerForm 
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value !== confirmPassword.value 
      ? { passwordMismatch: true } : null;
  }

onRegisterSubmit() {
  this.isSubmitted = true;

  // Kiểm tra nếu Form hợp lệ về mặt cú pháp ở Client
  if (this.registerForm.valid) {
    
    // Gán dữ liệu từ Form vào đối tượng gửi đi
    this.registerData = {
      fullName: this.registerForm.value.fullName,
      phoneNumber: this.registerForm.value.phoneNumber,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      address: this.registerForm.value.address
    };

    // BƯỚC 1: Gọi API gửi lên Backend
    this.registerService.postMessage(this.registerData).subscribe({
      next: (res) => {
        console.log('Backend xác nhận thành công:', res);

        // BƯỚC 2: Khi Backend trả về Success, mới hiện thông báo chúc mừng
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đăng ký thành công!',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        }).then(() => {
          // BƯỚC 3: Sau khi thông báo biến mất, mới chuyển trang đăng nhập
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        // BƯỚC 4: Nếu Backend báo lỗi (Trùng SĐT, lỗi hệ thống...)
        console.error('Lỗi từ Server:', err);

        // Lấy tin nhắn lỗi cụ thể từ Backend gửi về
        const serverMessage = err.error?.message || 'Đã có lỗi xảy ra khi đăng ký.';

   Swal.fire({
  toast: true,                // Chuyển sang dạng thanh thông báo nhỏ
  position: 'top-end',        // Đặt ở góc trên bên phải
  icon: 'error',
  title: 'Đăng ký thất bại',
  text: serverMessage,
  showConfirmButton: false,   // Ẩn nút đi vì đã có timer
  timer: 3000,                // Để 3 giây cho người dùng kịp đọc lỗi
  timerProgressBar: true      // Thanh chạy thời gian bên dưới
});
      }
    });

  } else {
    // Nếu Form Client chưa đúng (ví dụ thiếu số điện thoại)
    this.registerForm.markAllAsTouched();
    console.log('Form chưa hợp lệ, hãy kiểm tra các ô màu đỏ');
  }
}
  goToLogin() {
    this.router.navigate(['/login']);
  }
}