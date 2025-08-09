import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, tap, takeUntil } from 'rxjs/operators';
import { UserService } from 'src/app/services/user.service';
import { IRecord, ICart } from '../ecommerce.interface';
import { CartDetailService } from './cart-detail.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthGuard } from 'src/app/guards/auth-guard.service';
import { StockService } from './stock.service';

@Injectable({
  providedIn: 'root',
})
export class CartService implements OnDestroy {
  private readonly baseUrl = environment.apiUrl.shoppingService;
  private cart: IRecord[] = [];
  private cartSubject = new BehaviorSubject<IRecord[]>([]);
  private cartItemCountSubject = new BehaviorSubject<number>(0);
  readonly cartItemCount$ = this.cartItemCountSubject.asObservable();
  readonly cart$ = this.cartSubject.asObservable();
  private cartTotalSubject = new BehaviorSubject<number>(0);
  readonly cartTotal$ = this.cartTotalSubject.asObservable();
  private readonly destroy$ = new Subject<void>();
  cartEnabledSubject = new BehaviorSubject<boolean>(true);
  readonly cartEnabled$ = this.cartEnabledSubject.asObservable();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authGuard: AuthGuard,
    private readonly userService: UserService,
    private readonly cartDetailService: CartDetailService,
    private readonly stockService: StockService
  ) {
    this.initializeCart();
  }

  private initializeCart(): void {
    this.setupUserSubscription();
  }

  private setupUserSubscription(): void {
    this.userService.emailUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((email) => {
        if (email) {
          this.initializeCartForUser(email);
        } else {
          this.resetCart();
        }
      });
  }

  private initializeCartForUser(email: string): void {
    // First we try to load from localStorage
    const savedCart = this.getCartForUser(email);
    if (savedCart && savedCart.length > 0) {
      this.cartSubject.next(savedCart);
      this.cartItemCountSubject.next(savedCart.length);
      this.calculateAndUpdateLocalTotal();
    }

    // Then we sync with the backend
    this.syncCartWithBackend(email);
  }

  resetCart(): void {
    this.cartSubject.next([]);
    this.cartItemCountSubject.next(0);
    this.cartTotalSubject.next(0);
  }

  private updateCartState(cartItems: IRecord[]): void {
    this.cartSubject.next(cartItems);
    this.updateCartCount(cartItems);
    this.calculateAndUpdateLocalTotal();
    this.saveCartForUser(this.userService.email || '', cartItems);
  }

  private shouldSyncCart(email: string | null): boolean {
    // Check all necessary conditions
    return (
      !!email && this.cartEnabledSubject.value && this.authGuard.isLoggedIn()
    );
  }
  syncCartWithBackend(email: string): void {
    if (!email || !this.authGuard.isLoggedIn()) {
      console.warn('[CartService] Cannot sync cart - user not authenticated or email not provided');
      return;
    }

    // Skip cart sync for admin users
    if (this.authGuard.getRole() === 'Admin') {
      this.cart = [];
      this.updateCartState([]);
      return;
    }
    
    this.cartDetailService
      .getCartDetails(email)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('[CartService] Error syncing cart with backend:', error);
          return of({ $values: [] });
        })
      )
      .subscribe({
        next: (response: any) => {
          const cartDetails = response?.$values || [];
          if (cartDetails.length === 0) {
            this.updateCartState([]);
            return;
          }
          
          const updatedCart = cartDetails.map((detail: any) => ({
            ...detail,
            amount: Number(detail.amount) || 1,
            inCart: true,
            idRecord: detail.recordId,
            price: Number(detail.price) || 0,
            title: detail.titleRecord,
            image: detail.imageRecord,
            stock: detail.stock || 0,
          }));
          
          // Calculate total items for the cart counter
          const totalItems = updatedCart.reduce(
            (total: number, item: any) => total + (Number(item.amount) || 0), 
            0
          );
          
          // Update the cart state with the new items
          this.cart = updatedCart;
          this.cartSubject.next(updatedCart);
          this.cartItemCountSubject.next(totalItems);
          this.calculateAndUpdateLocalTotal();
          this.saveCartForUser(email, updatedCart);
          this.cartEnabledSubject.next(true);
        },
        error: (error) => {
          console.error('[CartService] Error syncing cart with backend:', {
            status: error.status,
            message: error.message,
            error: error.error
          });
          
          // If there's an error, try to load from local storage as fallback
          const savedCart = this.getCartForUser(email);
          if (savedCart && savedCart.length > 0) {
            this.updateCartState(savedCart);
          } else {
            this.updateCartState([]);
          }
        }
      });
  }

  addToCart(record: IRecord): Observable<any> {
    const userEmail = this.userService.email;
    if (!userEmail) return throwError(() => new Error('Unauthenticated user'));

    // Get the current stock before adding
    const currentStock = this.cartSubject.value.find(
      item => item.idRecord === record.idRecord
    )?.stock ?? record.stock;

    return this.cartDetailService
      .addToCartDetail(userEmail, record.idRecord, 1)
      .pipe(
        tap(() => {
          // Get current cart
          const currentCart = this.cartSubject.value;

          // Update the cart item
          const existingItem = currentCart.find(
            (item) => item.idRecord === record.idRecord
          );
          
          if (existingItem) {
            existingItem.amount = (existingItem.amount || 0) + 1;
            // Update the stock by decrementing it by 1 when adding to cart
            if (typeof currentStock === 'number') {
              existingItem.stock = Math.max(0, currentStock - 1);
              // Notify stock service of the update
              this.stockService.updateStock(record.idRecord, existingItem.stock);
            }
          } else {
            const newItem = {
              ...record,
              amount: 1,
              inCart: true,
              stock: typeof currentStock === 'number' ? Math.max(0, currentStock - 1) : 0,
            };
            currentCart.push(newItem);
          }

          // Update cart state
          this.updateCartState(currentCart);
        }),
        catchError((error) => {
          console.error('Error adding to cart:', error);
          return throwError(() => error);
        })
      );
  }

  removeFromCart(record: IRecord): Observable<any> {
    const userEmail = this.userService.email;
    if (!userEmail) {
      return throwError(() => new Error('Unauthenticated user'));
    }
    
    // Get the current stock before removal
    const currentStock = this.cartSubject.value.find(
      item => item.idRecord === record.idRecord
    )?.stock;

    return this.cartDetailService
      .removeFromCartDetail(userEmail, record.idRecord, 1)
      .pipe(
        tap(() => {
          // Get current cart
          const currentCart = this.cartSubject.value;
          // Update the cart item
          const existingItem = currentCart.find(
            (item) => item.idRecord === record.idRecord
          );
          
          if (existingItem) {
            // Update the amount
            existingItem.amount = Math.max(0, (existingItem.amount || 0) - 1);
            
            // Update the stock by incrementing it by 1 when removing from cart
            if (typeof currentStock === 'number') {
              existingItem.stock = currentStock + 1;
              // Notify stock service of the update
              this.stockService.updateStock(record.idRecord, existingItem.stock);
            }
            
            // Remove item if amount reaches 0
            if (existingItem.amount === 0) {
              const index = currentCart.indexOf(existingItem);
              if (index !== -1) {
                currentCart.splice(index, 1);
              }
            }
          }
          
          // Update cart state
          this.updateCartState(currentCart);
        }),
        catchError((error) => {
          console.error('Error removing from cart:', error);
          return throwError(() => error);
        })
      );
  }

  updateCartNavbar(itemCount: number, totalPrice: number): void {
    this.cartItemCountSubject.next(itemCount);
    this.cartTotalSubject.next(totalPrice);
  }

  getCartForUser(email: string): IRecord[] {
    const cartJson = localStorage.getItem(`cart_${email}`);
    return cartJson ? JSON.parse(cartJson) : [];
  }

  getCartItems(): Observable<IRecord[]> {
    return this.cart$;
  }

  saveCartForUser(email: string, cart: IRecord[]): void {
    localStorage.setItem(`cart_${email}`, JSON.stringify(cart));
  }

  updateCartItem(record: IRecord): void {
    const currentCart = this.cartSubject.value;
    const index = currentCart.findIndex(
      (item) => item.idRecord === record.idRecord
    );

    if (index !== -1) {
      currentCart[index] = { ...record };
      this.cartSubject.next([...currentCart]);
      this.updateCartCount(currentCart);
      this.calculateAndUpdateLocalTotal();
      this.saveCartForUser(this.userService.email || '', currentCart);
    }
  }

  getCart(email: string): Observable<ICart> {
    const url = `${this.baseUrl}Carts/GetCartByEmail/${encodeURIComponent(email)}`;
    const headers = this.getHeaders();
    return this.httpClient
      .get<ICart>(url, { headers })
      .pipe(
        catchError((error) => {
          console.error('[CartService] Error getting cart:', error);
          return of({} as ICart);
        })
      );
  }

  getCartStatus(email: string): Observable<{ enabled: boolean }> {
    const url = `${this.baseUrl}Carts/GetCartStatus/${encodeURIComponent(email)}`;
    const headers = this.getHeaders();
    return this.httpClient
      .get<{ enabled: boolean }>(url, { headers })
      .pipe(
        catchError((error) => {
          console.error('[CartService] Error getting cart status:', error);
          return of({ enabled: true });
        })
      );
  }

  private getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getAllCarts(): Observable<ICart[]> {
    const headers = this.getHeaders();
    return this.httpClient
      .get<ICart[]>(`${this.baseUrl}Carts`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error getting all carts:', error);
          return throwError(() => error);
        })
      );
  }

  disableCart(email: string): Observable<ICart> {
    const headers = this.getHeaders();
    return this.httpClient
      .post<ICart>(`${this.baseUrl}Carts/Disable/${email}`, {}, { headers })
      .pipe(
        tap((disabledCart) => {
          // Update local status immediately
          const currentCart = this.cartSubject.value;
          const updatedCart = currentCart.map((item) => ({
            ...item,
            price: 0,
            amount: 0, 
          }));
          this.updateCartState(updatedCart);
        }),
        catchError((error) => {
          console.error('Error disabling cart:', error);
          return throwError(() => error);
        })
      );
  }

  enableCart(email: string): Observable<any> {
    const headers = this.getHeaders();
    return this.httpClient
      .post(`${this.baseUrl}Carts/Enable/${email}`, {}, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error enabling cart:', error);
          return throwError(() => error);
        })
      );
  }

  private updateCartCount(cart: IRecord[]): void {
    const totalItems = cart.reduce(
      (total: number, item: IRecord) => total + (Number(item.amount) || 0),
      0
    );
    
    // Ensure we're in the Angular zone to trigger change detection
    if (this.cartItemCountSubject.value !== totalItems) {
      this.cartItemCountSubject.next(totalItems);
    } 
  }

  private calculateAndUpdateLocalTotal(): void {
    const total = this.cart.reduce(
      (sum: number, item: IRecord) => {
        const price = Number(item.price) || 0;
        const amount = Number(item.amount) || 0;
        const itemTotal = price * amount;
        return sum + itemTotal;
      },
      0
    );
    
    if (this.cartTotalSubject.value !== total) {
      this.cartTotalSubject.next(total);
    } 
  }
}
