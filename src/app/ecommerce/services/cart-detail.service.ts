import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  catchError,
  Observable,
  of,
  tap,
  map,
  throwError,
  switchMap,
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthGuard } from '../../guards/auth-guard.service';
import { ICartDetail, IRecord } from '../ecommerce.interface';
import { UserService } from 'src/app/services/user.service';
import { StockService } from './stock.service';
import { RecordsService } from './records.service';

@Injectable({
  providedIn: 'root',
})
export class CartDetailService {
  urlAPI = environment.apiUrl.shoppingService;
  private cart: IRecord[] = [];
  constructor(
    private http: HttpClient,
    private authGuard: AuthGuard,
    private userService: UserService,
    private stockService: StockService,
    private recordsService: RecordsService
  ) {}

  getCartItemCount(email: string): Observable<any> {
    // Verify that the email matches the current user
    if (this.userService.email !== email) {
      return of({ totalItems: 0 });
    }
    const headers = this.getHeaders();
    return this.http
      .get(`${this.urlAPI}CartDetails/GetCartItemCount/${encodeURIComponent(email)}`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error getting cart item count:', error);
          return of({ totalItems: 0 });
        })
      );
  }

  getCartDetails(email: string): Observable<{ $values: any[] }> {
    // Check if the user is authenticated before making the request
    if (!this.authGuard.isLoggedIn()) {
      console.warn('[CartDetailService] User is not authenticated');
      return of({ $values: [] });
    }

    // Get the current user's email to verify ownership
    const currentUser = this.authGuard.getUser();
    if (email !== currentUser) {
      console.warn(`[CartDetailService] Access denied: User ${currentUser} cannot access cart for ${email}`);
      return of({ $values: [] });
    }

    // Get the cart ID from the token or session storage
    const cartId = this.authGuard.getCartId();
    
    // If we don't have a cart ID, try to get cart by email
    if (!cartId) {
      return this.getCartDetailsByEmail(email).pipe(
        map(cartDetails => ({
          $values: Array.isArray(cartDetails) ? cartDetails : [cartDetails]
        })),
        catchError(error => {
          console.error('[CartDetailService] Error getting cart details by email:', error);
          return of({ $values: [] });
        })
      );
    }
    
    const headers = this.getHeaders();
    const url = `${this.urlAPI}CartDetails/GetCartDetailsByCartId/${cartId}`;
    
    return this.http.get<{ $values: any[] } | any[]>(url, { 
      headers,
      observe: 'response'
    }).pipe(
      map(response => {
        const body = response.body;
        // Handle different possible response formats
        if (Array.isArray(body)) {
          return { $values: body };
        } else if (body && Array.isArray((body as any).$values)) {
          return body as { $values: any[] };
        } else if (body && typeof body === 'object') {
          // If the response is an object but doesn't have $values, return it as is
          return { $values: [body] };
        } else {
          return { $values: [] };
        }
      }),
      catchError((error) => {
        console.error('[CartDetailService] Error getting cart details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url,
          headers: error.headers
        });
        
        if (error.status === 403) {
          console.warn('[CartDetailService] Access denied - User does not have permission to access this cart');
        }
        
        // Fall back to email-based endpoint if cart ID approach fails
        if (error.status === 404) {
          return this.http.get<{ $values: any[] }>(
            `${this.urlAPI}CartDetails/GetCartDetails/${encodeURIComponent(email)}`,
            { headers }
          ).pipe(
            catchError(fallbackError => {
              console.error('[CartDetailService] Fallback endpoint also failed:', fallbackError);
              return of({ $values: [] });
            })
          );
        }
        
        return of({ $values: [] });
      })
    );
  }

  // Debug method to check cart details
  debugGetCartDetails(email: string): void {
    const url = `${this.urlAPI}CartDetails/GetCartDetails/${encodeURIComponent(email)}`;
    console.log(`[CartDetailService][DEBUG] Fetching cart details from: ${url}`);
    
    this.http.get(url, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          if (response && typeof response === 'object') {
            console.log('[CartDetailService][DEBUG] Response keys:', Object.keys(response));
          }
        },
        error: (error) => {
          console.error('[CartDetailService][DEBUG] Error fetching cart details:', {
            status: error.status,
            error: error.error,
            url: error.url
          });
        }
      });
  }

  getRecordDetails(recordId: number): Observable<IRecord | null> {
    return this.recordsService.getRecordById(recordId).pipe(
      catchError((error) => {
        console.error('Error getting record details:', error);
        return of(null);
      })
    );
  }

  addToCartDetail(
    email: string,
    recordId: number,
    amount: number
  ): Observable<any> {
    const headers = this.getHeaders();
    //console.log(`[CartDetailService] Adding to cart - Email: ${email}, RecordId: ${recordId}, Amount: ${amount}`);
    
    return this.http
      .post(
        `${this.urlAPI}CartDetails/addToCartDetailAndCart/${encodeURIComponent(email)}?recordId=${recordId}&amount=${amount}`,
        {},
        { 
          headers,
          observe: 'response' 
        }
      )
      .pipe(
        switchMap((response: any) => {
          // Get the updated stock from the registry
          return this.getRecordDetails(recordId).pipe(
            map(record => {
              if (!record) {
                throw new Error('The updated record could not be obtained.');
              }
              return {
                success: true,
                recordId: recordId,
                amount: amount,
                stock: record.stock // Include updated stock
              };
            })
          );
        }),
        catchError((error) => {
          console.error('[CartDetailService] Error en addToCartDetail:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            url: error.url
          });
          return throwError(() => error);
        })
      );
  }

  removeFromCartDetail(
    email: string,
    recordId: number,
    amount: number
  ): Observable<any> {
    if (!email || !recordId) {
      return throwError(() => new Error('Invalid parameters'));
    }

    const headers = this.getHeaders();
    return this.http
      .post(
        `${this.urlAPI}CartDetails/removeFromCartDetailAndCart/${encodeURIComponent(email)}?recordId=${recordId}&amount=${amount}`,
        {},
        { 
          headers,
          observe: 'response'
        }
      )
      .pipe(
        switchMap((response: any) => {
          // Get the updated stock from the registry
          return this.getRecordDetails(recordId).pipe(
            map(record => {
              if (!record) {
                throw new Error('The updated record could not be obtained.');
              }
              return {
                success: true,
                recordId: recordId,
                amount: -amount,
                stock: record.stock // Include updated stock
              };
            })
          );
        }),
        catchError((error) => {
          console.error('[CartDetailService] Error removing from cart:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            url: error.url
          });
          return throwError(() => error);
        })
      );
  }

  addAmountCartDetail(detail: ICartDetail): Observable<ICartDetail> {
    return this.http.put<ICartDetail>(
      `${this.urlAPI}cartDetails/${detail.idCartDetail}`,
      detail
    );
  }

  updateRecordStock(recordId: number, change: number): Observable<IRecord> {
    if (typeof change !== 'number' || isNaN(change)) {
      return throwError(() => new Error('Invalid stock change value'));
    }

    return this.http
      .put<any>(
        `${this.urlAPI}records/${recordId}/updateStock/${change}`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(
        tap((response) => {
          const newStock = response?.newStock;
          if (typeof newStock === 'number' && newStock >= 0) {
            this.stockService.notifyStockUpdate(recordId, newStock);
          } else {
            throw new Error('Received invalid stock value from server');
          }
        }),
        map(
          (response) =>
            ({
              idRecord: recordId,
              stock: response.newStock,
              titleRecord: '',
              yearOfPublication: null,
              imageRecord: null,
              photo: null,
              price: 0,
              discontinued: false,
              groupId: null,
              groupName: '',
              nameGroup: '',
            } as IRecord)
        ),
        catchError((error) => {
          return throwError(
            () => new Error('Failed to update stock. Please try again.')
          );
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

  incrementQuantity(detail: ICartDetail): Observable<ICartDetail> {
    const previousAmount = detail.amount;
    detail.amount++;
    return new Observable((observer) => {
      this.addAmountCartDetail(detail).subscribe({
        next: () => {
          this.updateRecordStock(detail.recordId, -1).subscribe({
            next: () => {
              observer.next(detail);
              observer.complete();
            },
            error: (err) => {
              detail.amount = previousAmount;
              observer.error(err);
            },
          });
        },
        error: (err) => {
          detail.amount = previousAmount;
          observer.error(err);
        },
      });
    });
  }

  decrementQuantity(detail: ICartDetail): Observable<ICartDetail> {
    if (detail.amount <= 1) {
      // Do not allow quantities less than 1
      return of(detail); // Return the detail without changes
    }
    const previousAmount = detail.amount;
    detail.amount--;
    return new Observable((observer) => {
      this.addAmountCartDetail(detail).subscribe({
        next: () => {
          this.updateRecordStock(detail.recordId, 1).subscribe({
            next: () => {
              observer.next(detail);
              observer.complete();
            },
            error: (err) => {
              detail.amount = previousAmount;
              observer.error(err);
            },
          });
        },
        error: (err) => {
          detail.amount = previousAmount;
          observer.error(err);
        },
      });
    });
  }

  getCartDetailsByEmail(email: string): Observable<ICartDetail[]> {
    return this.http.get<ICartDetail[]>(
      `${this.urlAPI}cartdetails/getCartDetails/${email}`
    );
  }
}
