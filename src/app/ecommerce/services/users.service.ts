import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { IUser } from '../ecommerce.interface';
import { environment } from 'src/environments/environment';
import { AuthGuard } from '../../guards/auth-guard.service';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly baseUrl = environment.apiUrl.userService;

  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  private getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getUsers(): Observable<IUser[]> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.baseUrl}Users`, { headers }).pipe(
      map((response) => {
        // Handle different response formats
        let usersArray: any[] = [];
        
        if (Array.isArray(response)) {
          // Case 1: Response is already an array of users
          usersArray = response;
        } else if (response && typeof response === 'object') {
          // Case 2: Response has $values property
          if (Array.isArray(response.$values)) {
            usersArray = response.$values;
          } 
          // Case 3: Response is an object with users as direct properties
          else if (Object.keys(response).length > 0) {
            usersArray = Object.values(response);
          }
        }
        
        return usersArray as IUser[];
      }),
      tap(users => {
        if (users.length > 0) {
        } else {
          console.warn('[UsersService] No users found in the response');
        }
      }),
      catchError((error) => {
        console.error('[UsersService] Error fetching users:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        return of([]);
      })
    );
  }

  deleteUser(email: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete(
      `${this.baseUrl}Users/${encodeURIComponent(email)}`,
      { headers }
    );
  }
}
