import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rescue-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rescue-detail.component.html',
  styleUrls: ['./rescue-detail.component.css']
})
export class RescueDetailComponent {
  @Input() request: any;

  @Output() close = new EventEmitter<void>();



  
  isClosing = false;

  onClose() {
    this.isClosing = true;

    setTimeout(() => {
      this.close.emit();
    }, 220);
  }


isCopied = false;

copyCoordinates() {

  const text =
    `${this.request?.latitude},${this.request?.longitude}`;

  navigator.clipboard.writeText(text);

  this.isCopied = true;

  setTimeout(() => {
    this.isCopied = false;
  }, 2000);
}


}