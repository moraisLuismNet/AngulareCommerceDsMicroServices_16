import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, of } from 'rxjs';
import { takeUntil, filter, map, catchError, tap } from 'rxjs/operators';
import { ICartDetail, IRecord } from '../ecommerce.interface';
import { AuthGuard } from 'src/app/guards/auth-guard.service';
import { UserService } from 'src/app/services/user.service';
import { CartDetailService } from '../services/cart-detail.service';
import { CartService } from 'src/app/ecommerce/services/cart.service';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../services/order.service';

interface CartDetailItem {
  idCartDetail: number;
  cartId: number;
  recordId: number;
  imageRecord: string;
  titleRecord: string;
  groupName: string;
  amount: number;
  price: number;
  total: number;
}

interface CartResponse {
  $values?: CartDetailItem[];
}

interface ExtendedCartDetail extends ICartDetail {
  stock?: number;
  groupName?: string;
}

@Component({
  selector: 'app-cart-details',
  templateUrl: './cart-details.component.html',
  styleUrls: ['./cart-details.component.css'],
})
export class CartDetailsComponent implements OnInit, OnDestroy {
  cartDetails: ICartDetail[] = [];
  filteredCartDetails: ExtendedCartDetail[] = [];
  emailUser: string | null = '';
  isAddingToCart = false;
  private readonly destroy$ = new Subject<void>();
  currentViewedEmail: string = '';
  isViewingAsAdmin: boolean = false;
  isCreatingOrder = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | null = null;

  constructor(
    private readonly cartDetailService: CartDetailService,
    private readonly route: ActivatedRoute,
    private readonly authGuard: AuthGuard,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const viewingUserEmail = params['viewingUserEmail'];

        if (viewingUserEmail && this.userService.isAdmin()) {
          // Admin
          this.isViewingAsAdmin =
            viewingUserEmail && this.userService.isAdmin();
          this.currentViewedEmail = viewingUserEmail;
          this.isViewingAsAdmin = true;
          this.loadCartDetails(viewingUserEmail);
        } else {
          // User viewing their own cart
          this.userService.email$
            .pipe(
              takeUntil(this.destroy$),
              filter((email): email is string => !!email)
            )
            .subscribe((email) => {
              this.currentViewedEmail = email;
              this.isViewingAsAdmin = false;
              this.loadCartDetails(email);
            });
        }
      });
  }

  // Method to extract the group name from several possible locations
  private extractGroupName(detail: any): string {
    if (!detail) return 'Sin grupo';
    
    // List of possible group name locations
    const possibleGroupPaths = [
      detail.groupName,
      detail.nameGroup,
      detail.group?.name,
      detail.record?.groupName,
      detail.record?.nameGroup,
      detail.record?.group?.name,
      detail.record?.recordGroup?.name,
      detail.recordGroup?.name,
      detail.record?.group?.groupName,
      detail.record?.recordGroup?.groupName
    ];
    
    // Find the first valid value
    const groupName = possibleGroupPaths.find(name => 
      name !== undefined && name !== null && name !== '' && name !== 'N/A'
    );
    
    return groupName || 'Sin grupo';
  }

  private loadCartDetails(email: string): void {
    this.cartDetailService
      .getCartDetailsByEmail(email)
      .pipe(
        takeUntil(this.destroy$),
        map((response: any) => {
          // Handle different response formats
          let details = [];
          
          // Handle array response
          if (Array.isArray(response)) {
            details = response;
          } 
          // Handle { $id: "1", $values: [...] } format
          else if (response && response.$values && Array.isArray(response.$values)) {
            details = response.$values;
          }
          // Handle other possible formats
          else if (response && response.Items) {
            details = response.Items;
          }
          
          // Process each detail to ensure it has all required fields
          return details.map((detail: any) => {
            // Extract group information from various possible locations
            const groupName = this.extractGroupName(detail);
            // Return a properly formatted cart detail object
            return {
              idCartDetail: detail.idCartDetail,
              recordId: detail.recordId,
              amount: detail.amount || 0,
              cartId: detail.cartId,
              recordTitle: detail.recordTitle || detail.record?.titleRecord || 'Sin título',
              groupName: groupName,
              price: detail.price || 0,
              total: (detail.price || 0) * (detail.amount || 0),
              imageRecord: detail.imageRecord || detail.record?.imageRecord || 'assets/img/placeholder.png',
              record: detail.record
            };
          });
          return response?.$values || response?.Items || [];
        }),
        catchError((error) => {
          console.error('Error loading cart details:', error);
          return of([]); // Always return empty array on errors
        })
      )
      .subscribe((details) => {
        this.cartDetails = details;
        this.filteredCartDetails = this.getFilteredCartDetails();
        this.loadRecordDetails();
      });
  }

  private loadRecordDetails(): void {
    this.filteredCartDetails.forEach((detail) => {
      this.cartDetailService
        .getRecordDetails(detail.recordId)
        .pipe(
          takeUntil(this.destroy$),
          filter((record): record is IRecord => record !== null),
          catchError((error) => {
            console.error(`Error loading record details for record ${detail.recordId}:`, error);
            return of(null);
          })
        )
        .subscribe((record) => {
          if (!record) return;
          
          const index = this.filteredCartDetails.findIndex(
            (d) => d.recordId === detail.recordId
          );
          
          if (index !== -1) {
            const updatedDetail = {
              ...this.filteredCartDetails[index],
              stock: record.stock,
              groupName: record.groupName || record.nameGroup || 'N/A',
              recordTitle: record.titleRecord || 'No Title',
              price: record.price || 0,
              imageRecord: record.imageRecord || record.photo || 'assets/img/placeholder.png'
            } as ExtendedCartDetail;
            
            // Update the array immutably
            this.filteredCartDetails = [
              ...this.filteredCartDetails.slice(0, index),
              updatedDetail,
              ...this.filteredCartDetails.slice(index + 1)
            ];
            
            // Update the cart details array as well for consistency
            const cartDetailIndex = this.cartDetails.findIndex(
              d => d.recordId === detail.recordId
            );
            if (cartDetailIndex !== -1) {
              this.cartDetails[cartDetailIndex] = {
                ...this.cartDetails[cartDetailIndex],
                ...updatedDetail
              };
            }
          }
        });
    });
  }

  private getFilteredCartDetails(): ExtendedCartDetail[] {
    if (!Array.isArray(this.cartDetails)) return [];

    return this.cartDetails.filter(
      (detail) =>
        detail && typeof detail.amount === 'number' && detail.amount > 0
    ) as ExtendedCartDetail[];
  }

  async addToCart(detail: ICartDetail): Promise<void> {
    if (!this.currentViewedEmail || this.isAddingToCart) return;

    this.isAddingToCart = true;
    this.clearAlert();

    try {
      const updatedDetail = await this.cartDetailService
        .addToCartDetail(this.currentViewedEmail, detail.recordId, 1)
        .toPromise();

      // Update UI locally first for better user experience
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const updatedItem = {
          ...this.filteredCartDetails[itemIndex],
          amount: (this.filteredCartDetails[itemIndex].amount || 0) + 1,
          stock:
            updatedDetail?.stock || this.filteredCartDetails[itemIndex].stock,
        };
        this.filteredCartDetails[itemIndex] = updatedItem;
        this.updateCartTotals();
      }

      // Refresh data from the server
      await this.loadCartDetails(this.currentViewedEmail);

      // Update the stock value in the UI
      const updatedRecord = await this.cartDetailService
        .getRecordDetails(detail.recordId)
        .toPromise();
      if (updatedRecord) {
        const stockIndex = this.filteredCartDetails.findIndex(
          (d) => d.recordId === detail.recordId
        );
        if (stockIndex !== -1) {
          this.filteredCartDetails[stockIndex].stock = updatedRecord.stock;
        }
      }

      this.showAlert('Product added to cart', 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showAlert('Failed to add product to cart', 'error');
      // Revert local changes if it fails
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        this.filteredCartDetails[itemIndex].amount -= 1;
        this.updateCartTotals();
      }
    } finally {
      this.isAddingToCart = false;
    }
  }

  async removeRecord(detail: ICartDetail): Promise<void> {
    if (!this.currentViewedEmail || detail.amount <= 0) return;

    try {
      await this.cartDetailService
        .removeFromCartDetail(this.currentViewedEmail, detail.recordId, 1)
        .toPromise();

      // Update UI locally first for better user experience
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const updatedItem = {
          ...this.filteredCartDetails[itemIndex],
          amount: Math.max(
            0,
            (this.filteredCartDetails[itemIndex].amount || 0) - 1
          ),
        };
        this.filteredCartDetails[itemIndex] = updatedItem;
        this.updateCartTotals();
      }

      // Refresh data from the server
      await this.loadCartDetails(this.currentViewedEmail);

      // Update the stock value in the UI
      const updatedRecord = await this.cartDetailService
        .getRecordDetails(detail.recordId)
        .toPromise();
      if (updatedRecord) {
        const stockIndex = this.filteredCartDetails.findIndex(
          (d) => d.recordId === detail.recordId
        );
        if (stockIndex !== -1) {
          this.filteredCartDetails[stockIndex].stock = updatedRecord.stock;
        }
      }

      this.showAlert('Product removed from cart', 'success');
    } catch (error) {
      console.error('Error removing from cart:', error);
      this.showAlert('Failed to remove product from cart', 'error');
      // On error, reload the cart from server to ensure UI is in sync with backend
      await this.loadCartDetails(this.currentViewedEmail);
    }
  }

  private updateCartTotals(): void {
    const totalItems = this.filteredCartDetails.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const totalPrice = this.filteredCartDetails.reduce(
      (sum, d) => sum + (d.price || 0) * d.amount,
      0
    );
    this.cartService.updateCartNavbar(totalItems, totalPrice);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async createOrder(): Promise<void> {
    if (!this.currentViewedEmail || this.isViewingAsAdmin) return;

    this.isCreatingOrder = true;
    this.clearAlert();

    try {
      const paymentMethod = 'credit-card';
      const order = await this.orderService
        .createOrderFromCart(this.currentViewedEmail, paymentMethod)
        .toPromise();

      this.showAlert('Order created successfully', 'success');
      this.loadCartDetails(this.currentViewedEmail);
      this.cartService.updateCartNavbar(0, 0);
    } catch (error: any) {
      console.error('Full error:', error);
      const errorMsg = error.error?.message || 'Failed to create order';
      this.showAlert(errorMsg, 'error');
    } finally {
      this.isCreatingOrder = false;
    }
  }

  private showAlert(message: string, type: 'success' | 'error'): void {
    this.alertMessage = message;
    this.alertType = type;

    // Hide the message after 5 seconds
    setTimeout(() => this.clearAlert(), 5000);
  }

  private clearAlert(): void {
    this.alertMessage = '';
    this.alertType = null;
  }
}
