import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { Router, NavigationEnd } from '@angular/router';
import { CartService } from 'src/app/ecommerce/services/cart.service';
import { of, Subject } from 'rxjs';
import { takeUntil, filter, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  emailUser: string | null = null;
  role: string | null = null;
  cartItemsCount: number = 0;
  cartTotal: number = 0;
  currentRoute: string = '';
  private readonly destroy$ = new Subject<void>();
  cartEnabled: boolean = true;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly cartService: CartService
  ) {
    // Initialize the current route
    this.currentRoute = this.router.url;
  }

  ngOnInit(): void {
    this.userService.email$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(email => {
      this.emailUser = email;
      if (!email) {
        this.role = null;
      }
    });
    
    this.userService.role$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(role => {
      this.role = role;
    });

    // Subscription to user email
    this.userService.emailUser$
      .pipe(
        takeUntil(this.destroy$),
        tap((email) => {
          this.emailUser = email;
          if (!email) {
            this.cartItemsCount = 0;
            this.cartTotal = 0;
          }
        }),
        switchMap((email) => {
          if (email) {
            // Check cart status and then sync
            return this.cartService.getCartStatus(email).pipe(
              tap((status: { enabled: boolean }) => {
                this.cartEnabled = status.enabled;
                if (status.enabled) {
                  this.cartService.syncCartWithBackend(email);
                } else {
                  this.cartService.resetCart();
                }
              })
            );
          }
          return of(null);
        })
      )
      .subscribe();

    // Subscription to cart item count
    this.cartService.cartItemCount$
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe((count) => {
        this.cartItemsCount = count;
      });

    // Subscription to cart total
    this.cartService.cartTotal$
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe((total) => {
        this.cartTotal = total;
      });
    
    // Subscription to router events
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });
  }

  isAdmin(): boolean {
    return this.role === 'Admin';
  }

  isListGroupsPage(): boolean {
    return this.currentRoute.includes('/listgroups');
  }

  logout(): void {
    this.cartService.resetCart();
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.emailUser = null;
    this.role = null;
  }

  isLoginPage(): boolean {
    return this.currentRoute.includes('/login');
  }
}
