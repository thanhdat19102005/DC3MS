import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.css'
})
export class GuideComponent {
  // Output để UserComponent có thể lắng nghe và đóng modal
  closeGuide = output<void>();
  
  // Quản lý bước hiện tại (1 đến 4)
  currentStep = signal(1);

  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  reset() {
    this.currentStep.set(1);
  }

  close() {
    this.closeGuide.emit();
  }
}