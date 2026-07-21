import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rescue-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rescue-stats.component.html',
  styleUrls: ['./rescue-stats.component.css']
})
export class RescueStatsComponent implements OnChanges {
  @Input() requests: any[] = [];

  totalRequests = 0;
  pendingCount = 0;
  acceptedCount = 0;
  completedCount = 0;

  completionRate = 0;
  criticalCount = 0;
  avgPeople = 0;

  // THỜI GIAN XỬ LÝ TRUNG BÌNH
  avgProcessTime = 0;

  mostCommonType = 'Không xác định';
  aiStatus = 'Đang phân tích dữ liệu...';
  aiSuggestion = 'Chưa có đề xuất.';

  rescueTypeStats: any[] = [];

  trendData: number[] = [0, 0, 0, 0, 0, 0, 0];
  trendLabels: string[] = [];
  maxTrendValue = 1;

  ngOnChanges(): void {
    this.calculateStats();
  }

  private calculateStats() {
    this.totalRequests = this.requests.length;

    this.pendingCount = this.requests.filter(x => x.status === 0).length;
    this.acceptedCount = this.requests.filter(x => x.status === 1).length;
    this.completedCount = this.requests.filter(x => x.status === 2).length;

    this.criticalCount = this.requests.filter(x => x.isCritical).length;

    this.completionRate = this.totalRequests > 0
      ? Math.round((this.completedCount / this.totalRequests) * 100)
      : 0;

    const totalPeople = this.requests.reduce(
      (sum, x) => sum + (x.people || 0),
      0
    );

    this.avgPeople = this.totalRequests > 0
      ? Math.round(totalPeople / this.totalRequests)
      : 0;

    this.mostCommonType = this.getMostCommonType();

    this.rescueTypeStats = this.getRescueTypeStats();

    this.calculateTrendData();

    // TÍNH THỜI GIAN XỬ LÝ THẬT
    this.calculateAverageProcessTime();

    this.generateAiInsight();
  }

  private getMostCommonType(): string {
    const typeCount: any = {};

    this.requests.forEach(req => {
      const type = req.type || 'Không xác định';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const sorted = Object.entries(typeCount).sort(
      (a: any, b: any) => b[1] - a[1]
    );

    return sorted.length > 0 ? sorted[0][0] as string : 'Không xác định';
  }

  private getRescueTypeStats() {
    const typeCount: any = {};

    this.requests.forEach(req => {
      const type = req.type || 'Khác';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount).map(([type, count]: any) => {
      return {
        type,
        count,
        percent: this.totalRequests > 0
          ? Math.round((count / this.totalRequests) * 100)
          : 0
      };
    });
  }

  private calculateTrendData() {
    const result = [0, 0, 0, 0, 0, 0, 0];
    const labels: string[] = [];

    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(this.getDayLabel(d));
    }

    this.requests.forEach(req => {
      if (!req.createdAt) return;

      const created = new Date(req.createdAt);

      const createdDateOnly = new Date(
        created.getFullYear(),
        created.getMonth(),
        created.getDate()
      );

      const todayDateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const diffDays = Math.floor(
        (todayDateOnly.getTime() - createdDateOnly.getTime())
        / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= 0 && diffDays < 7) {
        const index = 6 - diffDays;
        result[index]++;
      }
    });

    this.trendData = result;
    this.trendLabels = labels;
    this.maxTrendValue = Math.max(...result, 1);
  }

  private calculateAverageProcessTime() {
    const completedRequests = this.requests.filter(
      x => x.createdAt && x.completedAtRaw
    );

    if (completedRequests.length === 0) {
      this.avgProcessTime = 0;
      return;
    }

    let totalMinutes = 0;

    completedRequests.forEach(req => {
      const created = new Date(req.createdAt);
      const completed = new Date(req.completedAtRaw);

      const diffMinutes =
        (completed.getTime() - created.getTime()) / (1000 * 60);

      if (diffMinutes > 0) {
        totalMinutes += diffMinutes;
      }
    });

    this.avgProcessTime = Math.round(
      totalMinutes / completedRequests.length
    );
  }

  getTrendHeight(value: number): number {
    if (this.maxTrendValue === 0) return 0;
    return Math.max((value / this.maxTrendValue) * 100, value > 0 ? 8 : 0);
  }

  private getDayLabel(date: Date): string {
    const day = date.getDay();

    switch (day) {
      case 1: return 'T2';
      case 2: return 'T3';
      case 3: return 'T4';
      case 4: return 'T5';
      case 5: return 'T6';
      case 6: return 'T7';
      case 0: return 'CN';
      default: return '';
    }
  }

  private generateAiInsight() {
    if (this.totalRequests === 0) {
      this.aiStatus = 'Chưa có đủ dữ liệu để phân tích.';
      this.aiSuggestion = 'Hệ thống sẽ đưa ra nhận xét khi có yêu cầu cứu hộ.';
      return;
    }

    if (this.completionRate >= 75) {
      this.aiStatus = `Tỉ lệ hoàn thành đạt ${this.completionRate}%, hoạt động cứu hộ đang ổn định.`;
    } else if (this.completionRate >= 40) {
      this.aiStatus = `Tỉ lệ hoàn thành đạt ${this.completionRate}%, cần theo dõi thêm các ca đang ứng cứu.`;
    } else {
      this.aiStatus = `Tỉ lệ hoàn thành chỉ đạt ${this.completionRate}%, cần tăng tốc điều phối cứu hộ.`;
    }

    if (this.criticalCount > 0) {
      this.aiSuggestion = `Có ${this.criticalCount} yêu cầu nguy kịch. Nên ưu tiên xử lý trước.`;
    } else if (this.acceptedCount > this.completedCount) {
      this.aiSuggestion = 'Số yêu cầu đang ứng cứu còn nhiều. Nên theo dõi tiến độ và nhắc đội cập nhật trạng thái.';
    } else {
      this.aiSuggestion = `Loại cứu hộ phổ biến nhất là ${this.mostCommonType}. Nên chuẩn bị thêm nguồn lực phù hợp.`;
    }
  }
}