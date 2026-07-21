import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  CommonModule
} from '@angular/common';

// Import LoginService để gọi các API liên quan đến xác thực (Login, Profile...)
import {
  LoginService
} from '../../../services/auth/login.service';

// Import định nghĩa cấu trúc dữ liệu đầu vào cho Form đăng nhập (phoneNumber, password)
import {
  LoginViewModel
} from './type/login';

// Import thư viện SweetAlert2 để tạo các hộp thoại thông báo đẹp mắt
import Swal from 'sweetalert2';

// Khai báo biến toàn cục 'google' để báo cho TypeScript biết thư viện Google Identity API (từ file index.html) có tồn tại
declare const google: any;

// Định nghĩa kiểu dữ liệu (Type) giới hạn các vai trò người dùng hợp lệ trong hệ thống
type Role =
  | 'user'
  | 'team'
  | 'admin';

@Component({
  selector: 'app-login', // Tên thẻ HTML đại diện cho component này (<app-login></app-login>)
  standalone: true,      // Khai báo đây là Component độc lập (không cần thông qua NgModule)
  imports: [
    FormsModule,         // Cần thiết để sử dụng liên kết dữ liệu 2 chiều [(ngModel)] trong form HTML
    CommonModule         // Cần thiết để sử dụng các chỉ thị cấu trúc cơ bản như *ngIf, *ngFor
  ],
  templateUrl: './login.component.html', // Đường dẫn tới file giao diện HTML
  styleUrl: './login.component.css'     // Đường dẫn tới file định dạng giao diện CSS
})
export class LoginComponent implements OnInit {

  // ================= ROLE UI =================
  // Sử dụng Angular Signal để quản lý trạng thái vai trò đang chọn trên giao diện (mặc định ban đầu là 'user')
  currentRole = signal<Role>('user');

  // ================= LOGIN MODEL =================
  // Khởi tạo đối tượng chứa dữ liệu người dùng nhập từ Form đăng nhập
  loginData: LoginViewModel = {
    phoneNumber: '',
    password: ''
  };

  // Hàm khởi tạo (Constructor): Nơi Inject (nhúng) các dịch vụ cần dùng vào Component
  constructor(
    private router: Router,             // Dịch vụ của Angular hỗ trợ điều hướng luân chuyển giữa các trang
    private loginService: LoginService  // Dịch vụ chứa các hàm gọi API backend đã viết trước đó
  ) {}

  // ================= INIT =================
  // Hàm này tự động chạy ngay sau khi Component được khởi tạo xong trên màn hình
  ngOnInit(): void {

    // ================= AUTO LOGIN (TỰ ĐỘNG ĐĂNG NHẬP) =================
    // Vừa vào trang login, lập tức gọi API profile() để check xem trình duyệt đã có sẵn Cookie đăng nhập hợp lệ chưa
    this.loginService
      .profile()
      .subscribe({
        // Nếu Backend phản hồi thành công (Có cookie hợp lệ)
        next: (res) => {
          console.log('Đã đăng nhập:', res);
          // Tiến hành chuyển hướng người dùng thẳng vào hệ thống dựa trên danh sách roles nhận được
          this.redirectByRole(res.roles);
        },
        // Nếu Backend trả về lỗi (Ví dụ: 401 Unauthorized - chưa đăng nhập hoặc cookie hết hạn)
        error: (err) => {
          console.log('Chưa đăng nhập', err); // Giữ người dùng lại trang login để họ thực hiện đăng nhập
        }
      });

    // ================= GOOGLE INIT (CẤU HÌNH ĐĂNG NHẬP GOOGLE) =================
    // Khởi tạo cấu hình kết nối với hệ thống xác thực của Google
    google.accounts.id.initialize({
      // Mã Client ID do bạn đăng ký trên Google Cloud Console để định danh ứng dụng của bạn
      client_id: '636824029101-fv38kjr9pm8gg7mjoi7n8som6ekup01k.apps.googleusercontent.com',

    // Callback: Hàm này sẽ tự động kích hoạt sau khi người dùng bấm nút đăng nhập Google thành công
      callback: (response: any) => {
        // response.credential chính là chuỗi IdToken (JWT) mà Google cấp để chứng minh danh tính user
        console.log('Google Credential:', response);

        // Gửi chuỗi IdToken này xuống Backend của bạn để Backend phân tích, xác thực và cấp Cookie quyền hạn
        this.loginService
          .googleLogin(response.credential)
          .subscribe({
            // Backend kiểm tra IdToken hợp lệ và xử lý đăng nhập thành công
            next: (res) => {
              console.log('Google Login Success:', res);
              // Lấy danh sách roles Backend trả về để chuyển hướng người dùng vào trang chức năng tương ứng
              this.redirectByRole(res.roles);
            },
            // Xử lý khi Backend từ chối IdToken hoặc xảy ra lỗi kết nối
            error: (err) => {
              console.log(err);
              // Hiển thị một popup thông báo lỗi nhỏ (Toast) ở góc trên bên phải màn hình
              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Google Login thất bại',
                text: err.error?.message || 'Đã có lỗi xảy ra.', // Hiển thị lỗi từ backend nếu có, ngược lại dùng câu mặc định
                showConfirmButton: false, // Không cần nút bấm đóng
                timer: 3000,              // Tự động đóng sau 3 giây
                timerProgressBar: true    // Hiển thị thanh đếm thời gian chạy dưới thông báo
              });
            }
          });
      }
    });

    // ================= RENDER GOOGLE BUTTON =================
    // Tìm phần tử HTML có id="googleButton" và vẽ nút Đăng nhập bằng Google chuẩn giao diện của họ vào đó
    google.accounts.id.renderButton(
      document.getElementById('googleButton'),
      {
        theme: 'outline', // Kiểu dáng nút có viền
        size: 'large',    // Kích thước nút lớn
        width: 300        // Chiều rộng cố định của nút là 300px
      }
    );
  }

  // ================= CHANGE ROLE =================
  // Hàm thay đổi giá trị của Signal currentRole khi người dùng tương tác lựa chọn vai trò trên UI
  setRole(role: Role): void {
    this.currentRole.set(role);
  }

  // ================= LOGIN (ĐĂNG NHẬP THƯỜNG) =================
  // Hàm xử lý khi người dùng nhấn nút "Đăng nhập" bằng Tài khoản (SĐT) và Mật khẩu thông thường
  onLogin(): void {
    // Gọi service với tham số là dữ liệu nhập và vai trò hiện tại từ Signal
    this.loginService
      .postMessage(this.loginData, this.currentRole())
      .subscribe({
        next: (res) => {
          console.log('Login success:', res);
          // Backend xác thực thành công, chuyển hướng dựa trên quyền nhận được
          this.redirectByRole(res.roles);
        },
        error: (err) => {
          console.error("Lỗi đăng nhập:", err.error);
          
          // Sử dụng định dạng Toast để thông báo ở góc phải màn hình
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Đăng nhập thất bại',
            text: err.error?.message || 'Đã có lỗi xảy ra khi đăng nhập.',
            // Nếu có debugInfo từ backend, nó sẽ hiển thị ở phần chân popup
           
            showConfirmButton: false,
            timer: 5000, // Tăng thời gian lên 5s để bạn có thời gian đọc debug
            timerProgressBar: true
          });
        }
      });
  }
  // ================= REDIRECT (HÀM ĐIỀU HƯỚNG THEO QUYỀN) =================
  // Hàm nội bộ (private) dùng để phân tích danh sách quyền (roles) nhận từ API nhằm chuyển hướng đến đúng Module
  private redirectByRole(roles: string[]): void {
    // 1. Nếu danh sách quyền có chứa 'Admin' -> Chuyển hướng đến route quản trị hệ thống
    if (roles.includes('Admin') || roles.includes('SuperAdmin')) {
      this.router.navigate(['/admin']);
    }
    // 2. Nếu danh sách quyền có chứa 'RescueTeam' -> Chuyển hướng đến trang tác nghiệp của Đội cứu hộ
    else if (roles.includes('RescueTeam')) {
      this.router.navigate(['/rescue-team']);
    }
    // 3. Nếu danh sách quyền có chứa 'Citizen' -> Chuyển hướng đến trang cá nhân dành cho Người dân
    else if (roles.includes('Citizen')) {
      this.router.navigate(['/user']);
    }
  }

  // ================= REGISTER =================
  // Hàm điều hướng người dùng sang trang Đăng ký tài khoản khi kích hoạt sự kiện bấm nút ký tài khoản mới
  onRegister(): void {
    this.router.navigate(['/register']);
  }

}