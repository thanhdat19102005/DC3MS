import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  AfterViewInit,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';

import * as L from 'leaflet';

@Component({
  selector: 'app-rescue-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rescue-map.component.html',
  styleUrls: ['./rescue-map.component.css']
})
export class RescueMapComponent implements AfterViewInit, OnChanges {

  @Input()
  requests: any[] = [];

  // =========================
  // GỬI REQUEST ĐƯỢC CHỌN LÊN COMPONENT CHA
  // Khi bấm nút "Chat với user"
  // =========================
  @Output()
  chatUserRequested = new EventEmitter<any>();

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requests'] && this.map) {
      this.renderMarkers();
    }
  }

  private initMap(): void {
    if (this.map) return;

    this.map = L.map('rescue-map').setView([16.047079, 108.20623], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);

    // =========================
    // Leaflet popup là HTML thuần
    // nên phải gắn click bằng JS sau khi popup mở
    // =========================
    this.map.on('popupopen', () => {
      this.bindChatUserButton();
    });

    setTimeout(() => {
      this.map?.invalidateSize();
      this.renderMarkers();
    }, 200);
  }

  private renderMarkers(): void {
    if (!this.map || !this.markerLayer) return;

    this.markerLayer.clearLayers();

    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const validRequests = this.requests.filter(
      r => r.latitude && r.longitude
    );

    validRequests.forEach(req => {
      L.marker([req.latitude, req.longitude], { icon: redIcon })
        .addTo(this.markerLayer!)
        .bindPopup(`
          <div class="map-popup">

            <h3>${req.type}</h3>

            <p>
              <strong>Người gửi:</strong>
              ${req.userName || 'Không xác định'}
            </p>

            <p>
              <strong>SĐT:</strong>
              ${req.phone || 'Không có'}
            </p>

            <p>
              <strong>Nội dung:</strong>
              ${req.content || ''}
            </p>

            <p>
              <strong>Mức độ:</strong>
              ${req.severity || ''}
            </p>

            <a
              href="https://www.google.com/maps?q=${req.latitude},${req.longitude}"
              target="_blank"
              class="map-link">
              Mở Google Maps
            </a>

            <div class="popup-action-row">

              <span class="status-badge ${this.getStatusInfo(req.status).className}">
                ${this.getStatusInfo(req.status).text}
              </span>

              <button
                type="button"
                class="chat-user-btn js-chat-user-btn"
                data-request-id="${req.id}">
                Chat với user
              </button>

            </div>
           
          </div>
        `);
    });

    if (validRequests.length > 0) {
      const bounds = L.latLngBounds(
        validRequests.map(req => [req.latitude, req.longitude])
      );

      this.map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 13
      });
    }
  }

  // =========================
  // GẮN CLICK CHO NÚT CHAT VỚI USER
  // =========================
  private bindChatUserButton(): void {
    const button =
      document.querySelector('.js-chat-user-btn') as HTMLButtonElement | null;

    if (!button) {
      return;
    }

    button.onclick = () => {
      const requestId =
        button.getAttribute('data-request-id');

      const selectedRequest =
        this.requests.find(req => String(req.id) === String(requestId));

      if (!selectedRequest) {
        console.warn('Không tìm thấy request để chat.');
        return;
      }

      console.log('Chat với user request:', selectedRequest);

      this.chatUserRequested.emit(selectedRequest);
    };
  }

  // =========================
  // FORMAT STATUS
  // =========================
  getStatusInfo(status: number) {
    switch (status) {
      case 0:
        return {
          text: 'Chờ xử lý',
          className: 'status-pending'
        };

      case 1:
        return {
          text: 'Đang ứng cứu',
          className: 'status-rescuing'
        };

      case 2:
        return {
          text: 'Hoàn thành',
          className: 'status-completed'
        };

      default:
        return {
          text: 'Không xác định',
          className: 'status-unknown'
        };
    }
  }
}