import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {

    return this.http.get(
      `${environment.apiUrl}/Account/profile`,
      { withCredentials: true }
    ).pipe(

      //  login OK
      map(() => true),

      //  chưa login
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })

    );
  }
}