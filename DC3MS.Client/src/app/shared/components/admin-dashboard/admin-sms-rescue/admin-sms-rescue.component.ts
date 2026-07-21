import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import {
  ReceivedSmsItem,
  SmsService
} from '../../../../services/sms/sms.service';

type SmsReceiverMode = 'single' | 'all';
type SmsStatus = 'received';

@Component({
  selector: 'app-admin-sms-rescue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-sms-rescue.component.html',
  styleUrl: './admin-sms-rescue.component.css'
})
export class AdminSmsRescueComponent implements OnInit {

  receiverMode: SmsReceiverMode = 'single';

  selectedReceiver = '';
  phoneNumber = '';
  messageContent = '';
  smsType = 'Đầu số ngẫu nhiên';
  sender = '';

  statusFilter = 'all';
  isSending = false;
  isLoadingHistory = false;

  currentPage = 1;
  pageSize = 5;

  citizenList = [
    { id: 'citizen-1', name: 'Nguyễn Văn A', phone: '0901234567' },
    { id: 'citizen-2', name: 'Trần Thị B', phone: '0912345678' },
    { id: 'citizen-3', name: 'Lê Văn C', phone: '0888123456' }
  ];

  smsHistory: any[] = [];

  constructor(
    private smsService: SmsService
  ) {}

  ngOnInit(): void {
    this.loadSmsHistory();
  }

  get characterCount(): number {
    return this.messageContent.length;
  }

  get filteredSmsHistory(): any[] {
    if (this.statusFilter === 'all') {
      return this.smsHistory;
    }

    return this.smsHistory.filter(
      item => item.status === this.statusFilter
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredSmsHistory.length / this.pageSize) || 1;
  }

  get pages(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  get paginatedSmsHistory(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredSmsHistory.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  get displayStart(): number {
    if (this.filteredSmsHistory.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get displayEnd(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredSmsHistory.length
    );
  }

  loadSmsHistory(): void {
    this.isLoadingHistory = true;

    this.smsService.getReceivedSms().subscribe({
      next: (res: ReceivedSmsItem[]) => {
        const data = Array.isArray(res) ? res : [];

        this.smsHistory = data.map(item => ({
          id: item.id,
          phone: item.phone,
          content: item.content,
          time: item.time,
          isRead: item.isRead,
          status: 'received' as SmsStatus
        }));

        this.currentPage = 1;
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('LOAD SMS NGƯỜI DÂN PHẢN HỒI THẤT BẠI:', err);
        this.isLoadingHistory = false;

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'error',
          title: 'Không thể tải SMS người dân phản hồi',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true
        });
      }
    });
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  onReceiverModeChange(mode: SmsReceiverMode): void {
    this.receiverMode = mode;
    this.selectedReceiver = '';
    this.phoneNumber = '';

    if (mode === 'all') {
      this.phoneNumber = 'Tất cả người dân';
    }
  }

  onSelectReceiver(): void {
    const selected = this.citizenList.find(
      x => x.id === this.selectedReceiver
    );

    if (selected) {
      this.phoneNumber = selected.phone;
    }
  }

  getStatusText(status: SmsStatus): string {
    switch (status) {
      case 'received':
        return 'Đã nhận';
      default:
        return 'Không rõ';
    }
  }

  getStatusClass(status: SmsStatus): string {
    switch (status) {
      case 'received':
        return 'status-success';
      default:
        return '';
    }
  }

  addNewPhone(): void {
    Swal.fire({
      icon: 'info',
      title: 'Thêm số mới',
      text: 'Bạn có thể mở popup thêm số mới ở đây.',
      confirmButtonColor: '#2563eb'
    });
  }

  sendSms(): void {
    if (this.receiverMode === 'single') {
      this.sendSingleSms();
      return;
    }

    this.sendSmsToAllCitizens();
  }

  private sendSingleSms(): void {
    if (!this.phoneNumber.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu số điện thoại',
        text: 'Vui lòng nhập số điện thoại.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!this.messageContent.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu nội dung',
        text: 'Vui lòng nhập nội dung tin nhắn.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    this.isSending = true;

    this.smsService
      .sendSms(this.phoneNumber, this.messageContent)
      .subscribe({
        next: (res) => {
          console.log('GỬI SMS THÀNH CÔNG:', res);

          this.isSending = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Gửi SMS thành công',
            showConfirmButton: false,
            timer: 1800,
            timerProgressBar: true
          });

          this.selectedReceiver = '';
          this.phoneNumber = '';
          this.messageContent = '';

          this.loadSmsHistory();
        },
        error: (err) => {
          console.error('GỬI SMS THẤT BẠI:', err);

          this.isSending = false;

          Swal.fire({
            icon: 'error',
            title: 'Gửi SMS thất bại',
            text: err.error?.message || err.error || 'Không thể gửi SMS.',
            confirmButtonColor: '#2563eb'
          });

          this.loadSmsHistory();
        }
      });
  }

  private sendSmsToAllCitizens(): void {
    if (!this.messageContent.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu nội dung',
        text: 'Vui lòng nhập nội dung tin nhắn.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: 'Gửi SMS cho toàn bộ người dân?',
      text: 'Tin nhắn sẽ được gửi đến tất cả tài khoản có vai trò Citizen.',
      showCancelButton: true,
      confirmButtonText: 'Gửi ngay',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#2563eb'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.isSending = true;

      this.smsService
        .sendSmsToAllCitizens(this.messageContent)
        .subscribe({
          next: (res: any) => {
            console.log('GỬI SMS TOÀN BỘ THÀNH CÔNG:', res);

            this.isSending = false;

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: res?.message || 'Đã gửi SMS cho toàn bộ người dân',
              showConfirmButton: false,
              timer: 2200,
              timerProgressBar: true
            });

            this.messageContent = '';
            this.phoneNumber = 'Tất cả người dân';

            this.loadSmsHistory();
          },
          error: (err) => {
            console.error('GỬI SMS TOÀN BỘ THẤT BẠI:', err);

            this.isSending = false;

            Swal.fire({
              icon: 'error',
              title: 'Gửi SMS toàn bộ thất bại',
              text: err.error?.message || err.error || 'Không thể gửi SMS toàn bộ.',
              confirmButtonColor: '#2563eb'
            });

            this.loadSmsHistory();
          }
        });
    });
  }

  viewSmsDetail(item: any): void {
    Swal.fire({
      title: 'Chi tiết SMS người dân phản hồi',
      html: `
        <p><b>Số điện thoại:</b> ${item.phone}</p>
        <p><b>Thời gian:</b> ${item.time}</p>
        <p><b>Trạng thái:</b> ${this.getStatusText(item.status)}</p>
        <hr>
        <p style="text-align:left">${item.content}</p>
      `,
      confirmButtonColor: '#2563eb'
    });
  }

  deleteReceivedSms(item: any): void {
    Swal.fire({
      icon: 'warning',
      title: 'Xóa tin nhắn này?',
      text: 'Tin nhắn phản hồi của người dân sẽ bị xóa khỏi hệ thống.',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.smsService.deleteReceivedSms(item.id).subscribe({
        next: (res: any) => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: res?.message || 'Đã xóa tin nhắn',
            showConfirmButton: false,
            timer: 1600,
            timerProgressBar: true
          });

          this.loadSmsHistory();
        },
        error: (err) => {
          console.error('XÓA SMS PHẢN HỒI THẤT BẠI:', err);

          Swal.fire({
            icon: 'error',
            title: 'Xóa tin nhắn thất bại',
            text: err.error?.message || err.error || 'Không thể xóa tin nhắn.',
            confirmButtonColor: '#2563eb'
          });
        }
      });
    });
  }

  reloadData(): void {
    this.loadSmsHistory();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Đã làm mới dữ liệu SMS',
      showConfirmButton: false,
      timer: 1500
    });
  }
}