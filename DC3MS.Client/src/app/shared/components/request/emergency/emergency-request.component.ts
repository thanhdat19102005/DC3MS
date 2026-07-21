import {
  Component,
  Output,
  EventEmitter,
  output,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { EmergencyRequestService } from '../../../../services/user/request/emergency/emergency-request.service'; 
import { RegisterReliefComponent } from '../../../components/relief/register-relief.component'; // <-- THÊM MỚI: Import RegisterReliefComponent (Nhớ sửa đường dẫn cho đúng thư mục của bạn)
import Swal from 'sweetalert2';





@Component({
  selector: 'app-emergency-request',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RegisterReliefComponent],
  templateUrl: './emergency-request.component.html',
  styleUrl: './emergency-request.component.css'
})
export class EmergencyRequestComponent implements OnInit { 
  closeRequest = output<void>();
  isClosing = signal(false);
  
  // --- Animation cho form Đăng ký ---
  showRegisterForm = signal(false);
  isRegisterClosing = signal(false); // Biến kiểm soát hiệu ứng tắt mượt

  tab = signal<'note' | 'voice'>('note');

@Output()
requestCreated = new EventEmitter<void>();


  

  public rescueForm = new FormGroup({
    senderName: new FormControl(''), 
    phoneNumber: new FormControl(''),
    rescueType: new FormControl('Y Tế', [Validators.required]),
    content: new FormControl(''), 
    latitude: new FormControl(0),
    longitude: new FormControl(0)
  });

  locationString = '';
  isFetching = false;
  isSending = false; 
  recognition: any;
  transcript = '';
  isListening = false;
  selectedFiles: File[] = [];
  imagePreviews: string[] = []; 

  constructor(private rescueService: EmergencyRequestService) {
    const { webkitSpeechRecognition }: any = window as any;
    if (webkitSpeechRecognition) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.lang = 'vi-VN';
      this.recognition.interimResults = true;
      this.recognition.continuous = true;

      this.recognition.onresult = (event: any) => {
        let result = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          result += event.results[i][0].transcript;
        }
        this.transcript = result;
      };
      this.recognition.onerror = () => this.stopListening();
      this.recognition.onend = () => this.isListening = false;
    }
  }

  ngOnInit() { this.loadUserData(); }

  loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.rescueForm.patchValue({
      senderName: currentUser.fullName || currentUser.username || 'Người dùng hệ thống',
      phoneNumber: currentUser.username || '0000000000'
    });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      this.selectedFiles.push(...newFiles);
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => { this.imagePreviews.push(e.target.result); };
        reader.readAsDataURL(file);
      });
    }
    event.target.value = '';
  }

  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  sendRequest() {
    if (this.isListening) this.stopListening();
    this.rescueForm.patchValue({ content: this.transcript });

    if (!this.locationString) {
      Swal.fire({ toast: true, timerProgressBar: true  ,position: 'top-end', icon: 'warning', title: 'Thiếu vị trí', text: 'Vui lòng lấy GPS!', showConfirmButton: false, timer: 3000 });
      return;
    }

    this.isSending = true; 
    const data = this.rescueForm.value;
    this.rescueService.createEmergencyRequest(data, this.selectedFiles).subscribe({
      next: (res) => {
        this.requestCreated.emit();
        this.isSending = false; 
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gửi thành công', showConfirmButton: false, timer: 3000 });
        this.close();
      },
      error: (err) => {
        this.isSending = false; 
        if (err.error?.code === 'INCOMPLETE_PROFILE') {
          Swal.fire({ icon: 'warning',  toast: true, position: 'top-end' ,title: 'Hồ sơ chưa hoàn thiện', text: err.error.message ,confirmButtonText: 'Bổ sung ngay', confirmButtonColor: '#1976d2' })
          .then((result) => { if (result.isConfirmed) this.showRegisterForm.set(true); });
        }
        /*  TẦNG BẮT LỖI 2 (THÊM MỚI): Chặn spam nếu người dùng đã có 1 request chưa xử lý xong */
        else if (err.error?.code === 'SPAM_BLOCKED') {
          Swal.fire({
            icon: 'error',
            toast: true,
            position: 'top-start',     // Hiện góc trên bên trái màn hình
            title: 'Gửi thất bại',
            text: err.error?.message,   // Tự động ăn theo câu chữ ngắn gọn mới của Backend
            showConfirmButton: false,  // Ẩn nút bấm to đùng
            timer: 7000,               // Tự tắt sau 4 giây
            timerProgressBar: true
          });
        }
      
        else {
          Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Gửi thất bại', text: err.error?.message || 'Lỗi kết nối', showConfirmButton: false, timer: 4000 });
        }
      }
    });
  }

  // --- Hàm đóng form Đăng ký có hiệu ứng ---
  closeRegister() {
    this.isRegisterClosing.set(true);
    setTimeout(() => {
      this.showRegisterForm.set(false);
      this.isRegisterClosing.set(false);
    }, 300); // Chờ 0.3s cho animation chạy xong
  }

  handleIncompleteProfileSubmit(extraData: { phoneNumber: string; address: string }) {
    this.rescueForm.patchValue({ phoneNumber: extraData.phoneNumber });
    const currentContent = this.rescueForm.get('content')?.value || '';
    this.rescueForm.patchValue({ content: `[Địa chỉ: ${extraData.address}] - ${currentContent}` });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.username = extraData.phoneNumber; 
    currentUser.address = extraData.address;
    localStorage.setItem('user', JSON.stringify(currentUser));

    this.closeRegister(); // Tắt mượt
    this.sendRequest();
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => this.closeRequest.emit(), 300);
  }

  getLocation() {
    if (this.isFetching) return;
    this.isFetching = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locationString = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        this.rescueForm.patchValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        this.isFetching = false;
      },
      () => { alert('Lỗi GPS!'); this.isFetching = false; },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  toggleListening() { this.isListening ? this.stopListening() : this.startListening(); }
  startListening() { this.isListening = true; this.recognition.start(); }
  stopListening() { this.isListening = false; this.recognition.stop(); }
}