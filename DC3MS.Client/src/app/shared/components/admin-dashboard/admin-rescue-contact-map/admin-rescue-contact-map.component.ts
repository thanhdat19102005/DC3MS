import {
  AfterViewInit,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import * as L from 'leaflet';
import Swal from 'sweetalert2';

import {
  UserRescueMapService
} from '../../../../services/user/user-rescue-map/user-rescue-map.service';

import {
  AdminRescueTeamService
} from '../../../../services/admin-rescue-team/admin-rescue-team.service';

@Component({
  selector: 'app-admin-rescue-contact-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './admin-rescue-contact-map.component.html',
  styleUrl: './admin-rescue-contact-map.component.css'
})
export class AdminRescueContactMapComponent implements OnInit, AfterViewInit {

  rescueTeams: any[] = [];
  isLoadingTeams = false;

  isRequestModalOpen = false;
  selectedTeam: any = null;

  tab: 'note' | 'voice' = 'note';

  isSending = false;

  transcript = '';
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  rescueForm = new FormGroup({
    senderName: new FormControl('Admin hệ thống'),
    phoneNumber: new FormControl('0000000000'),

    rescueTeamId: new FormControl(''),

    rescueType: new FormControl('Di Tản', [Validators.required]),
    content: new FormControl(''),

    latitude: new FormControl<number | null>(null, [Validators.required]),
    longitude: new FormControl<number | null>(null, [Validators.required]),

    urgencyLevel: new FormControl('Bình Thường', [Validators.required]),
    peopleCount: new FormControl(1, [
      Validators.required,
      Validators.min(1)
    ]),

    hasChildren: new FormControl(false),
    hasElderly: new FormControl(false),

    healthStatus: new FormControl('Bình Thường', [Validators.required]),

    alternativePhoneNumber: new FormControl('', [
      Validators.pattern(/^(03|05|07|08|09)+([0-9]{8})$/)
    ])
  });

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private zoneLayer: L.LayerGroup | null = null;

  private readonly mapId = 'admin-rescue-contact-map';

  constructor(
    private userRescueMapService: UserRescueMapService,
    private adminRescueTeamService: AdminRescueTeamService
  ) {}

  ngOnInit(): void {
    this.loadActiveTeams();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  reloadMapData(): void {
    this.loadActiveTeams();
  }

  private loadActiveTeams(): void {
    this.isLoadingTeams = true;

    this.userRescueMapService
      .getActiveTeams()
      .subscribe({
        next: (res: any) => {
          this.rescueTeams = res.teams || [];
          this.isLoadingTeams = false;
          this.renderMapData();
        },
        error: (err) => {
          console.error('Lỗi lấy đội cứu hộ:', err);
          this.rescueTeams = [];
          this.isLoadingTeams = false;
          this.renderMapData();
        }
      });
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    this.map = L.map(this.mapId, {
      zoomControl: false
    }).setView([16.047079, 108.20623], 6);

    L.control.zoom({
      position: 'topleft'
    }).addTo(this.map);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap'
      }
    ).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.zoneLayer = L.layerGroup().addTo(this.map);

    this.map.on('popupopen', () => {
      this.bindPopupButtons();
    });

    setTimeout(() => {
      this.map?.invalidateSize();
      this.renderMapData();
    }, 250);
  }

  private renderMapData(): void {
    if (!this.map || !this.markerLayer || !this.zoneLayer) {
      return;
    }

    this.markerLayer.clearLayers();
    this.zoneLayer.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    this.renderDemoZones();

    const validTeams = this.rescueTeams.filter(
      team => team.latitude && team.longitude
    );

    validTeams.forEach(team => {
      const teamPoint: L.LatLngExpression = [
        team.latitude,
        team.longitude
      ];

      boundsPoints.push(teamPoint);

      L.marker(teamPoint, {
        icon: this.createTeamIcon()
      })
        .addTo(this.markerLayer!)
        .bindPopup(`
          <div class="admin-team-popup">
            <div class="popup-title-row">
              <h3>${team.teamName || 'Đội cứu hộ'}</h3>
              <span>Đang hoạt động</span>
            </div>

            <p>
              <strong>Trạng thái:</strong>
              Đang hoạt động
            </p>

            <p>
              <strong>SĐT:</strong>
              ${team.contactPhone || 'Đang cập nhật'}
            </p>

            <p>
              <strong>Khu vực:</strong>
              ${team.district || ''} ${team.province || ''}
            </p>

            <div class="popup-action-row">
              <a
                href="https://www.google.com/maps?q=${team.latitude},${team.longitude}"
                target="_blank"
                class="map-link">
                Mở Google Maps
              </a>

              <button
                type="button"
                class="send-request-popup-btn js-send-rescue-request-btn"
                data-team-id="${team.id}">
                Gửi yêu cầu cứu hộ
              </button>
            </div>
          </div>
        `);
    });

    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);

      this.map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 13
      });
    }
  }

  private bindPopupButtons(): void {
    const requestButton =
      document.querySelector('.js-send-rescue-request-btn') as HTMLButtonElement | null;

    if (!requestButton) {
      return;
    }

    requestButton.onclick = () => {
      const teamId = requestButton.getAttribute('data-team-id');

      const selectedTeam =
        this.rescueTeams.find(team => team.id === teamId);

      if (!selectedTeam) {
        return;
      }

      this.openRequestModal(selectedTeam);
    };
  }

  openRequestModal(team: any): void {
    this.selectedTeam = team;

    this.rescueForm.patchValue({
      rescueTeamId: team.id,
      latitude: null,
      longitude: null
    });

    this.isRequestModalOpen = true;
  }

  closeRequestModal(): void {
    this.isRequestModalOpen = false;
    this.selectedTeam = null;

    this.selectedFiles = [];
    this.imagePreviews = [];
    this.transcript = '';

    this.rescueForm.reset({
      senderName: 'Admin hệ thống',
      phoneNumber: '0000000000',
      rescueTeamId: '',
      rescueType: 'Di Tản',
      content: '',
      latitude: null,
      longitude: null,
      urgencyLevel: 'Bình Thường',
      peopleCount: 1,
      hasChildren: false,
      hasElderly: false,
      healthStatus: 'Bình Thường',
      alternativePhoneNumber: ''
    });
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;

    if (files && files.length > 0) {
      const newFiles = Array.from(files);

      this.selectedFiles.push(...newFiles);

      newFiles.forEach(file => {
        const reader = new FileReader();

        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };

        reader.readAsDataURL(file);
      });
    }

    event.target.value = '';
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  sendRequest(): void {
    this.rescueForm.patchValue({
      content: this.transcript
    });

    const latitude = this.rescueForm.get('latitude')?.value;
    const longitude = this.rescueForm.get('longitude')?.value;

    if (latitude === null || longitude === null) {
      alert('Vui lòng nhập vĩ độ và kinh độ của người cần cứu.');
      return;
    }

    if (this.rescueForm.invalid) {
      this.rescueForm.markAllAsTouched();
      return;
    }

    this.isSending = true;

    this.adminRescueTeamService
      .createRequestForTeam(
        this.rescueForm.value,
        this.selectedFiles
      )
      .subscribe({
        next: (res) => {
          console.log('GỬI YÊU CẦU THÀNH CÔNG:', res);

          this.isSending = false;

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã gửi yêu cầu cứu hộ thành công',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });

          this.closeRequestModal();
        },
        error: (err) => {
          console.error('Lỗi gửi yêu cầu cứu hộ:', err);

          this.isSending = false;

          alert(
            err.error?.message ||
            'Gửi yêu cầu cứu hộ thất bại.'
          );
        }
      });
  }

  private renderDemoZones(): void {
    if (!this.zoneLayer) {
      return;
    }

    L.circle([10.906, 106.76], {
      radius: 2500,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.16,
      weight: 1
    }).addTo(this.zoneLayer);

    L.circle([10.86, 106.72], {
      radius: 2200,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.18,
      weight: 1
    }).addTo(this.zoneLayer);

    L.circle([10.84, 106.78], {
      radius: 2000,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.16,
      weight: 1
    }).addTo(this.zoneLayer);
  }

  goToVietnam(): void {
    this.map?.setView([16.047079, 108.20623], 6);
  }

  private createTeamIcon(): L.DivIcon {
    return L.divIcon({
      className: 'custom-admin-team-marker',
      html: `<div class="marker-team">🚑</div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });
  }
}