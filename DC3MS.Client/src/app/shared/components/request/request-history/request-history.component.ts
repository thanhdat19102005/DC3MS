import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef, HostListener, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RequestHistoryService } from '../../../../services/user/request/request-history/request-history.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-request-history',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './request-history.component.html',
  styleUrl: './request-history.component.css',
  encapsulation: ViewEncapsulation.None 
})
export class RequestHistoryComponent implements OnInit {
  @Output() closeRequestHistory = new EventEmitter<void>();

  public isClosing = false; 
  public isLoading = true;       
  public isSaving = false;        
  public isEditing = false;       
  public isSwitchingView = false; 
  public isFetchingGPS = false;    
  public errorMessage = '';      
  public userRequest: any = null; 
  private rawRequestData: any = null; 

  // Trạng thái kiểm soát màn hình "Xem Chi Tiết"
  public isViewingDetail = false;

  // Trạng thái kiểm soát ẩn/hiện popup QR và các chuỗi liên kết vị trí cứu trợ
  public showShareQRModal = false;
  public shareLocationLink = '';
  public qrCodeApiUrl = ''; 

  public showRescueTypeDropdown = false;
  public showUrgencyDropdown = false;
  public showHealthDropdown = false;

  public editForm = new FormGroup({
    rescueType: new FormControl('Di Tản', [Validators.required]),
    urgencyLevel: new FormControl('Bình Thường', [Validators.required]),
    peopleCount: new FormControl(1, [Validators.required, Validators.min(1)]),
    hasChildren: new FormControl(false),
    hasElderly: new FormControl(false),
    healthStatus: new FormControl('Bình Thường', [Validators.required]),
    alternativePhoneNumber: new FormControl('', [
      Validators.pattern(/^(03|05|07|08|09)+([0-9]{8})$/) 
    ]),
    content: new FormControl(''),
    latitude: new FormControl(0),  
    longitude: new FormControl(0)  
  });

  constructor(
    private requestHistoryService: RequestHistoryService,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadActiveRequest();
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.isEditing) return;
    const clickedInside = this.el.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.showRescueTypeDropdown = false;
    this.showUrgencyDropdown = false;
    this.showHealthDropdown = false;
    this.cdr.detectChanges();
  }

  public loadActiveRequest(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userRequest = null;
    this.cdr.detectChanges(); 

    this.requestHistoryService.getActiveRequest().subscribe({
      next: (res) => {
        this.rawRequestData = res; 
        this.userRequest = {
          id: res.id,
          type: res.rescueType,
          statusCode: res.status, 
          urgency: res.urgencyLevel,
          content: res.content,
          peopleCount: res.peopleCount,
          healthStatus: res.healthStatus,
          latitude: res.latitude,
          longitude: res.longitude,
          alternativePhoneNumber: res.alternativePhoneNumber || 'Không có',
          hasChildren: res.hasChildren,
          hasElderly: res.hasElderly,
          location: `${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}`,
          time: new Date(res.createdAt).toLocaleString('vi-VN') 
        };
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Không thể kết nối đến hệ thống trực ban.';
        this.cdr.detectChanges(); 
      }
    });
  }

  public editRequest(): void {
    if (!this.rawRequestData) return;

    this.isSwitchingView = true; 
    this.cdr.detectChanges();

    setTimeout(() => {
      this.editForm.patchValue({
        rescueType: this.rawRequestData.rescueType || 'Di Tản',
        urgencyLevel: this.rawRequestData.urgencyLevel || 'Bình Thường',
        peopleCount: this.rawRequestData.peopleCount,
        hasChildren: this.rawRequestData.hasChildren,
        hasElderly: this.rawRequestData.hasElderly,
        healthStatus: this.rawRequestData.healthStatus,
        alternativePhoneNumber: this.rawRequestData.alternativePhoneNumber || '',
        content: this.rawRequestData.content,
        latitude: this.rawRequestData.latitude || 0,
        longitude: this.rawRequestData.longitude || 0
      });

      this.isViewingDetail = false;
      this.isEditing = true; 
      this.isSwitchingView = false; 
      this.closeAllDropdowns();
    }, 200); 
  }

  public viewDetails(): void {
    if (!this.userRequest) return;
    this.isSwitchingView = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isViewingDetail = true;
      this.isEditing = false;
      this.isSwitchingView = false;
      this.cdr.detectChanges();
    }, 200);
  }

  public closeDetailView(): void {
    this.isSwitchingView = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isViewingDetail = false;
      this.isSwitchingView = false;
      this.cdr.detectChanges();
    }, 200);
  }



// HÀM MỚI ĐỂ COPY LINK
  public copyShareLink(event: Event): void {
    event.stopPropagation();
    if (!this.userRequest) return;
    
    // Tạo link Google Maps chuẩn với tọa độ động
    const link = `https://www.google.com/maps/search/?api=1&query=${this.userRequest.latitude},${this.userRequest.longitude}`;
    
    navigator.clipboard.writeText(link).then(() => {
      // Giữ nguyên Swal.fire của bạn
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Đã sao chép liên kết vị trí!',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
    }).catch(() => {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Quyền Clipboard bị chặn!' });
    });
  }


  public copyShareLinkToClipboard(): void {
    navigator.clipboard.writeText(this.shareLocationLink).then(() => {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã sao chép liên kết!', showConfirmButton: false, timer: 2000 });
    });
  }
  // --- HẾT PHẦN MỚI ---

  public toggleRescueTypeDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showRescueTypeDropdown;
    this.closeAllDropdowns();
    this.showRescueTypeDropdown = !currentState;
    this.cdr.detectChanges();
  }

  public toggleUrgencyDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showUrgencyDropdown;
    this.closeAllDropdowns();
    this.showUrgencyDropdown = !currentState;
    this.cdr.detectChanges();
  }

  public toggleHealthDropdown(event: Event): void {
    event.stopPropagation();
    const currentState = this.showHealthDropdown;
    this.closeAllDropdowns();
    this.showHealthDropdown = !currentState;
    this.cdr.detectChanges();
  }

  public selectRescueType(value: string): void {
    this.editForm.patchValue({ rescueType: value });
    this.showRescueTypeDropdown = false;
    this.cdr.detectChanges();
  }

  public selectUrgencyLevel(value: string): void {
    this.editForm.patchValue({ urgencyLevel: value });
    this.showUrgencyDropdown = false;
    this.cdr.detectChanges();
  }

  public selectHealthStatus(value: string): void {
    this.editForm.patchValue({ healthStatus: value });
    this.showHealthDropdown = false;
    this.cdr.detectChanges();
  }

  public refreshLocation(): void {
    if (this.isFetchingGPS) return;
    this.isFetchingGPS = true;
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.editForm.patchValue({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        this.isFetchingGPS = false;

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã cập nhật GPS mới',
          text: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          showConfirmButton: false,
          timer: 2500
        });
        this.cdr.detectChanges();
      },
      () => {
        this.isFetchingGPS = false;
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Lỗi GPS!', text: 'Vui lòng bật định vị thiết bị.', showConfirmButton: false, timer: 3000 });
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  public cancelEdit(): void {
    this.isSwitchingView = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isEditing = false;
      this.isSwitchingView = false;
      this.cdr.detectChanges();
    }, 200);
  }

  public submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    const updatedData = {
      ...this.rawRequestData, 
      ...this.editForm.value  
    };

    this.requestHistoryService.updateRequest(this.rawRequestData.id, updatedData).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.isEditing = false;
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã cập nhật yêu cầu thành công!',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });

        this.loadActiveRequest(); 
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire({
          icon: 'error',
          toast: true,
          position: 'top-end',
          title: 'Lỗi cập nhật',
          text: err.error?.message || 'Có lỗi xảy ra khi gửi dữ liệu lên Server.',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
        this.cdr.detectChanges();
      }
    });
  }

  public cancelRequest(): void {
    if (!this.rawRequestData || !this.rawRequestData.id) return;

    Swal.fire({
      title: 'Hủy yêu cầu cứu trợ?',
      text: "Đội cứu hộ sẽ không thể định vị để điều phối người cứu hộ cho bạn nữa!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Đồng ý hủy',
      cancelButtonText: 'Quay lại',
      customClass: {
        popup: 'mini-confirm-popup',    
        title: 'mini-confirm-title',
        htmlContainer: 'mini-confirm-text'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true; 
        this.cdr.detectChanges();

        this.requestHistoryService.deleteRequest(this.rawRequestData.id).subscribe({
          next: (res) => {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: res.message || 'Hủy yêu cầu thành công.',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });

            this.closeWithAnimation();
          },
          error: (err) => {
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              toast: true,
              position: 'top-end',
              title: 'Hủy đơn thất bại',
              text: err.error?.message || 'Không thể gửi lệnh xóa lên tổng đài.',
              showConfirmButton: false,
              timer: 3000
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  public getStatusText(code: number): string {
    switch(code) {
      case 0: return 'Đang chờ xử lý'; 
      case 1: return 'Đang ứng cứu';
      case 2: return 'Hoàn thành';
      default: return 'Không xác định';
    }
  }

  public closeWithAnimation(): void {
    this.isClosing = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.closeRequestHistory.emit();
    }, 300); 
  }
}