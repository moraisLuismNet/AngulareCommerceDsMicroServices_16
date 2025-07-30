import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { CartService } from '../services/cart.service';
import { ICart } from '../ecommerce.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carts',
  templateUrl: './carts.component.html',
  styleUrls: ['./carts.component.css'],
})
export class CartsComponent implements OnInit {
  carts: ICart[] = [];
  filteredCarts: ICart[] = [];
  loading = false;
  errorMessage = '';
  isAdmin = false;
  searchText: string = '';
  visibleError = false;

  constructor(
    private cartService: CartService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.userService.isAdmin();
    this.loadCarts();
  }

  loadCarts(): void {
    this.loading = true;

    if (this.isAdmin) {
      this.cartService.getAllCarts().subscribe({
        next: (data: any) => {
          // Extracts values ​​correctly from the response object
          const receivedCarts = data.$values || data;

          // Ensures that it is always an array
          this.carts = Array.isArray(receivedCarts)
            ? receivedCarts
            : [receivedCarts];

          this.filteredCarts = [...this.carts];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.errorMessage = 'Error loading carts';
          this.visibleError = true;
          this.loading = false;
        },
      });
    } else {
      const userEmail = this.userService.email;
      if (!userEmail) {
        this.errorMessage = 'No user logged in';
        this.visibleError = true;
        this.loading = false;
        return;
      }

      this.cartService.getCart(userEmail).subscribe({
        next: (data) => {
          this.carts = Array.isArray(data) ? data : [data];
          this.filteredCarts = [...this.carts];
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error loading your cart';
          this.visibleError = true;
          this.loading = false;
        },
      });
    }
  }

  filterCarts() {
    if (!this.searchText) {
      this.filteredCarts = [...this.carts];
    } else {
      this.filteredCarts = this.carts.filter((cart) =>
        cart.userEmail.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }

  onSearchChange() {
    this.filterCarts();
  }

  // Method to navigate to details
  navigateToCartDetails(userEmail: string) {
    this.router.navigate(['/cart-details'], {
      queryParams: { email: userEmail },
    });
  }

  toggleCartStatus(email: string, enable: boolean): void {
    this.loading = true;

    const operation = enable
      ? this.cartService.enableCart(email)
      : this.cartService.disableCart(email);

    operation.subscribe({
      next: (updatedCart) => {
        // Update cart locally
        const cartIndex = this.carts.findIndex((c) => c.userEmail === email);
        if (cartIndex !== -1) {
          this.carts[cartIndex] = {
            ...this.carts[cartIndex],
            enabled: enable,
            totalPrice: enable ? this.carts[cartIndex].totalPrice : 0,
          };
          this.filterCarts(); // Refresh the filtered list
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error toggling cart status:', error);
        this.errorMessage = `Error ${enable ? 'enabling' : 'disabling'} cart`;
        this.visibleError = true;
        this.loading = false;
      },
    });
  }
}
