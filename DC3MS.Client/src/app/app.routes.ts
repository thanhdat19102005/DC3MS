import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth/authguard';
import { title } from 'process';
import { UserSettingsComponent } from './shared/components/user/user-settings/user-settings.component';



export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => 
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Đăng nhập'
  },
  {
    path: 'user',
    loadComponent: () => 
    import('./shared/components/user/user.component').then(m => m.UserComponent),
    title: 'Thông tin người dùng',
     canActivate: [AuthGuard]
  },

{
    /* ĐƯỜNG DẪN REGISTER MỚI THÊM VÀO */
    path: 'register',
    loadComponent: () => 
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Đăng ký tài khoản'
  },


  {
    /*  ĐƯỜNG DẪN TRANG BẢN ĐỒ TÁCH RIÊNG - LAZY LOADING */
    path: 'weather',
    loadComponent: () => 
      import('./shared/components/weather/weather-radar.component').then(m => m.WeatherRadarComponent),
    title: 'Giám sát khí tượng thủy văn',
    canActivate: [AuthGuard]
  },

{
    path: 'news',
    loadComponent: () => 
      import('./shared/components/news/news.component').then(m => m.NewsComponent),
    title: 'Tin tức cứu trợ',
    canActivate: [AuthGuard]
  },



{
    path: 'rescue-team',
    loadComponent: () => 
      import('./shared/components/rescue-team/rescue-team.component').then(m => m.RescueTeamComponent),
    title: 'Đội cứu trợ',
    canActivate: [AuthGuard]
  },



{
  path: 'video-test',
  loadComponent: () =>
    import('./shared/test/video-test.component')
      .then(m => m.VideoTestComponent),
  title: 'Video Test'
},

{
  path: 'admin',
  loadComponent: () =>
    import('./shared/components/admin-dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
  title: 'Quản trị hệ thống',
  canActivate: [AuthGuard]
},


  // Mặc định điều hướng về login
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  },




];