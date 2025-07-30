import { Component, OnInit, OnDestroy } from '@angular/core';
import { OrderService } from '../services/order.service';
import { UserService } from 'src/app/services/user.service';
import { Subject } from 'rxjs';
import { IOrder } from '../ecommerce.interface';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: IOrder[] = [];
  filteredOrders: IOrder[] = [];
  loading = true;
  searchText: string = '';
  expandedOrderId: number | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private orderService: OrderService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.emailUser$.subscribe((email) => {
      if (email) {
        this.loadOrders(email);
      }
    });
  }

  loadOrders(email: string): void {
    this.loading = true;
    this.orderService.getOrdersByUserEmail(email).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.filteredOrders = [...orders];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.orders = [];
        this.filteredOrders = [];
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleOrderDetails(orderId: number): void {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderId === orderId;
  }

  filterOrders() {
    this.filteredOrders = this.orders.filter((order) =>
      order.orderDate.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  onSearchChange() {
    this.filterOrders();
  }
}
