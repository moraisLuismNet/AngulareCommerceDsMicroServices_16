import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthGuard } from 'src/app/guards/auth-guard.service';
import { IGroup } from '../ecommerce.interface';

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly baseUrl = environment.apiUrl.cdService;
  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  getGroups(): Observable<IGroup[]> {
    const headers = this.getHeaders();
    
    return this.http
      .get<any>(`${this.baseUrl}groups`, { headers })
      .pipe(
        map((response) => {
          // Handle different response formats
          let groups: any[] = [];
          
          if (Array.isArray(response)) {
            // If the response is already an array
            groups = response;
          } else if (response && typeof response === 'object') {
            // If the response is an object with a $values property (common in .NET Core)
            if (response.hasOwnProperty('$values')) {
              groups = response.$values || [];
            } else if (response.hasOwnProperty('data')) {
              // If the response has a data property (common in some APIs)
              groups = response.data || [];
            } else {
              // If it's an object but not in the expected format, try to convert it to an array
              groups = Object.values(response);
            }
          }
          
          return groups as IGroup[];
        }),
        catchError((error: any) => {
          console.error('Error in getGroups:', error);
          return of([]); // Return empty array on error to prevent breaking the subscription
        })
      );
  }

  addGroup(group: IGroup): Observable<IGroup> {
    const headers = this.getHeaders();
    const formData = new FormData();
    formData.append('nameGroup', group.nameGroup);
    if (group.photo) {
      formData.append('photo', group.photo);
    }
    formData.append('musicGenreId', group.musicGenreId?.toString()!);
    return this.http.post<IGroup>(`${this.baseUrl}groups`, formData, {
      headers,
    });
  }

  updateGroup(group: IGroup): Observable<IGroup> {
    const headers = this.getHeaders();
    const formData = new FormData();
    formData.append('nameGroup', group.nameGroup);
    formData.append('musicGenreId', group.musicGenreId?.toString()!);
    if (group.photo) {
      formData.append('photo', group.photo);
    }

    return this.http.put<IGroup>(
      `${this.baseUrl}groups/${group.idGroup}`,
      formData,
      { headers }
    );
  }

  deleteGroup(id: number): Observable<IGroup> {
    const headers = this.getHeaders();
    return this.http.delete<IGroup>(`${this.baseUrl}groups/${id}`, {
      headers,
    });
  }

  getGroupName(idGroup: string | number): Observable<string> {
    const headers = this.getHeaders();
    return this.http
      .get<any>(`${this.baseUrl}groups/${idGroup}`, { headers })
      .pipe(
        map((response) => {
          
          // Handle direct group object
          if (
            response &&
            typeof response === 'object' &&
            'nameGroup' in response
          ) {
            return response.nameGroup;
          }

          // Handle $values wrapper
          if (
            response &&
            response.$values &&
            typeof response.$values === 'object'
          ) {
            if (
              Array.isArray(response.$values) &&
              response.$values.length > 0
            ) {
              return response.$values[0].nameGroup || '';
            }
            if ('nameGroup' in response.$values) {
              return response.$values.nameGroup;
            }
          }

          return '';
        })
      );
  }

  getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return headers;
  }
}
