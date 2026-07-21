import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import * as L from 'leaflet';

import {
  UserRescueMapService
} from '../../../../services/user/user-rescue-map/user-rescue-map.service';

@Component({
  selector: 'app-user-rescue-map',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './user-rescue-map.component.html',
  styleUrl: './user-rescue-map.component.css'
})
export class UserRescueMapComponent implements OnInit, AfterViewInit, OnChanges {

  @Input()
  userLocation: {
    latitude: number;
    longitude: number;
  } | null = null;

  @Output()
  teamChatRequested = new EventEmitter<any>();

  @Output()
  activeRequestChanged = new EventEmitter<any>();

  rescueTeams: any[] = [];

  activeRequest: any = null;

  isLoadingTeams = false;
  isLoadingRequest = false;

  private map: L.Map | null = null;

  private markerLayer: L.LayerGroup | null = null;
  private routeLayer: L.LayerGroup | null = null;
  private zoneLayer: L.LayerGroup | null = null;

  private readonly mapId = 'user-rescue-map';

  constructor(
    private userRescueMapService: UserRescueMapService
  ) {}

  ngOnInit(): void {
    this.loadActiveTeams();
    this.loadMyActiveRequestLocation();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.map &&
      changes['userLocation']
    ) {
      this.renderMapData();
    }
  }

  reloadMapData(): void {
    this.loadActiveTeams();
    this.loadMyActiveRequestLocation();
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
          console.error(
            'Lỗi lấy đội cứu hộ đang hoạt động:',
            err
          );

          this.rescueTeams = [];
          this.isLoadingTeams = false;

          this.renderMapData();
        }
      });
  }

  private loadMyActiveRequestLocation(): void {
    this.isLoadingRequest = true;

    this.userRescueMapService
      .getMyActiveRequestLocation()
      .subscribe({
        next: (res: any) => {
          this.activeRequest = {
            id: res.requestId,

            senderName: res.senderName,
            phoneNumber: res.phoneNumber,

            latitude: res.latitude,
            longitude: res.longitude,

            status: res.status,

            rescueType: res.rescueType,
            urgencyLevel: res.urgencyLevel,
            content: res.content,

            createdAt: res.createdAt
          };

          this.activeRequestChanged.emit(this.activeRequest);

          console.log(
            'ACTIVE REQUEST EMIT LÊN CHA:',
            this.activeRequest
          );

          this.isLoadingRequest = false;

          this.renderMapData();
        },

        error: (err) => {
          console.warn(
            'User hiện không có yêu cầu cứu trợ đang hoạt động:',
            err
          );

          this.activeRequest = null;

          this.activeRequestChanged.emit(null);

          this.isLoadingRequest = false;

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
    this.routeLayer = L.layerGroup().addTo(this.map);
    this.zoneLayer = L.layerGroup().addTo(this.map);

    this.map.on('popupopen', () => {
      this.bindTeamChatButton();
    });

    setTimeout(() => {
      this.map?.invalidateSize();
      this.renderMapData();
    }, 250);
  }

  private renderMapData(): void {
    if (
      !this.map ||
      !this.markerLayer ||
      !this.routeLayer ||
      !this.zoneLayer
    ) {
      return;
    }

    this.markerLayer.clearLayers();
    this.routeLayer.clearLayers();
    this.zoneLayer.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    this.renderDemoZones();

    if (
      this.activeRequest &&
      this.activeRequest.latitude &&
      this.activeRequest.longitude
    ) {
      const requestPoint: L.LatLngExpression = [
        this.activeRequest.latitude,
        this.activeRequest.longitude
      ];

      boundsPoints.push(requestPoint);

      L.marker(
        requestPoint,
        {
          icon: this.createRequestIcon(this.activeRequest.status)
        }
      )
        .addTo(this.markerLayer)
        .bindPopup(`
          <div class="user-map-popup">

            <h3>
              ${this.activeRequest.rescueType || 'Yêu cầu cứu trợ'}
            </h3>

            <p>
              <strong>Người gửi:</strong>
              ${this.activeRequest.senderName || 'Không xác định'}
            </p>

            <p>
              <strong>SĐT:</strong>
              ${this.activeRequest.phoneNumber || 'Không có'}
            </p>

            <p>
              <strong>Nội dung:</strong>
              ${this.activeRequest.content || 'Đang cập nhật'}
            </p>

            <p>
              <strong>Mức độ:</strong>
              ${this.activeRequest.urgencyLevel || 'Đang cập nhật'}
            </p>

            <p>
              <strong>Trạng thái:</strong>
              ${this.getStatusText(this.activeRequest.status)}
            </p>

            <a
              href="https://www.google.com/maps?q=${this.activeRequest.latitude},${this.activeRequest.longitude}"
              target="_blank"
              class="map-link">
              Mở Google Maps
            </a>

          </div>
        `);
    }

    const validTeams = this.rescueTeams.filter(
      team => team.latitude && team.longitude
    );

    validTeams.forEach(team => {
      const teamPoint: L.LatLngExpression = [
        team.latitude,
        team.longitude
      ];

      boundsPoints.push(teamPoint);

      L.marker(
        teamPoint,
        {
          icon: this.createTeamIcon()
        }
      )
        .addTo(this.markerLayer!)
        .bindPopup(`
          <div class="team-map-popup">

            <h3>${team.teamName || 'Đội cứu hộ'}</h3>

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
                class="team-chat-popup-btn js-team-chat-btn"
                data-team-id="${team.id}">
                Chat với đội
              </button>

            </div>

          </div>
        `);
    });

    if (
      this.activeRequest &&
      this.activeRequest.latitude &&
      this.activeRequest.longitude &&
      validTeams.length > 0
    ) {
      const nearestTeam = this.findNearestTeam(
        this.activeRequest.latitude,
        this.activeRequest.longitude,
        validTeams
      );

      if (nearestTeam) {
        const requestPoint: L.LatLngExpression = [
          this.activeRequest.latitude,
          this.activeRequest.longitude
        ];

        const teamPoint: L.LatLngExpression = [
          nearestTeam.latitude,
          nearestTeam.longitude
        ];

        L.polyline(
          [
            requestPoint,
            teamPoint
          ],
          {
            color: '#2563eb',
            weight: 3,
            opacity: 0.8,
            dashArray: '8, 8'
          }
        ).addTo(this.routeLayer);
      }
    }

    if (boundsPoints.length > 0) {
      const bounds =
        L.latLngBounds(boundsPoints);

      this.map.fitBounds(
        bounds,
        {
          padding: [50, 50],
          maxZoom: 13
        }
      );
    }
  }

  private bindTeamChatButton(): void {
    const button =
      document.querySelector('.js-team-chat-btn') as HTMLButtonElement | null;

    if (!button) {
      return;
    }

    button.onclick = () => {
      const teamId =
        button.getAttribute('data-team-id');

      const selectedTeam =
        this.rescueTeams.find(team => team.id === teamId);

      if (!selectedTeam) {
        console.warn('Không tìm thấy đội cứu hộ để chat.');
        return;
      }

      console.log('Mở chat với đội:', selectedTeam);

      this.teamChatRequested.emit(selectedTeam);
    };
  }

  private renderDemoZones(): void {
    if (!this.zoneLayer) {
      return;
    }

    L.circle(
      [10.906, 106.76],
      {
        radius: 2500,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.16,
        weight: 1
      }
    ).addTo(this.zoneLayer);

    L.circle(
      [10.86, 106.72],
      {
        radius: 2200,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.18,
        weight: 1
      }
    ).addTo(this.zoneLayer);

    L.circle(
      [10.84, 106.78],
      {
        radius: 2000,
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.16,
        weight: 1
      }
    ).addTo(this.zoneLayer);
  }

  goToMyLocation(): void {
    if (
      this.map &&
      this.activeRequest &&
      this.activeRequest.latitude &&
      this.activeRequest.longitude
    ) {
      this.map.setView(
        [
          this.activeRequest.latitude,
          this.activeRequest.longitude
        ],
        14
      );
    }
  }

  private createTeamIcon(): L.DivIcon {
    return L.divIcon({
      className: 'custom-team-marker',
      html: `<div class="marker-team">🚑</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  }

  private createRequestIcon(status: number): L.DivIcon {
    const className =
      status === 2
        ? 'marker-request-done'
        : status === 1
          ? 'marker-request-processing'
          : 'marker-request-danger';

    const text =
      status === 2
        ? '✓'
        : status === 1
          ? '!'
          : '!';

    return L.divIcon({
      className: 'custom-request-marker',
      html: `<div class="${className}">${text}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  }

  getStatusText(status: number): string {
    switch (status) {
      case 0:
        return 'Chờ xử lý';

      case 1:
        return 'Đang ứng cứu';

      case 2:
        return 'Hoàn thành';

      default:
        return 'Không xác định';
    }
  }

  private findNearestTeam(
    lat: number,
    lng: number,
    teams: any[]
  ): any {
    return teams
      .map(team => ({
        ...team,
        distance: this.calculateDistance(
          lat,
          lng,
          team.latitude,
          team.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadius = 6371;

    const dLat =
      this.toRadians(lat2 - lat1);

    const dLon =
      this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadius * c;
  }

  private toRadians(
    angle: number
  ): number {
    return angle * Math.PI / 180;
  }
}