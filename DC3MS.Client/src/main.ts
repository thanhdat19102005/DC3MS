import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { UserComponent } from './app/shared/components/user/user.component';
import {App} from "./app/app";

// Chỉ chạy duy nhất lệnh này để khởi động ứng dụng với UserComponent
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));