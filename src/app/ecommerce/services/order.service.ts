import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { IOrder } from '../ecommerce.interface';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly baseUrl = environment.apiUrl.shoppingService;

  constructor(private http: HttpClient) {}

  createOrderFromCart(
    userEmail: string,
    paymentMethod: string
  ): Observable<IOrder> {
    return this.http.post<IOrder>(
      `${this.baseUrl}orders/from-cart/${encodeURIComponent(userEmail)}`,
      `"${paymentMethod}"`, // Note the quotes for raw string JSON
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      }
    );
  }

  getAllOrders(): Observable<IOrder[]> {
    return this.http.get<any>(`${this.baseUrl}orders`).pipe(
      map((response) => {
        const orders = response?.$values || response || [];
        return orders.map((order: any) => this.normalizeOrder(order));
      }),
      catchError((error) => {
        console.error('Error loading all orders:', error);
        return of([]);
      })
    );
  }

  getOrdersByUserEmail(email: string): Observable<IOrder[]> {
    return this.http
      .get<any>(`${this.baseUrl}orders/${encodeURIComponent(email)}`)
      .pipe(
        map((response) => {
          // Handle different possible response formats
          let orders: any[] = [];
          
          if (Array.isArray(response)) {
            // Case 1: Response is already an array of orders
            orders = response;
          } else if (response && typeof response === 'object') {
            // Case 2: Response is an object with $values property
            orders = response.$values || [];
            
            // Case 3: Response is an object with orders directly in it
            if (orders.length === 0 && Object.keys(response).length > 0) {
              orders = Object.values(response);
            }
          }
          
          return orders.map((order: any) => this.normalizeOrder(order));
        }),
        catchError((error) => {
          console.error('Error processing orders:', {
            error,
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message
          });
          return of([]);
        })
      );
  }

  private normalizeOrder(order: any): IOrder {
    if (!order) {
      return this.getEmptyOrder();
    }

    const details = order.orderDetails?.$values || order.orderDetails || [];

    return {
      idOrder: order.idOrder || 0,
      orderDate: order.orderDate
        ? new Date(order.orderDate).toISOString()
        : new Date().toISOString(),
      paymentMethod: order.paymentMethod || 'Unknown',
      total: order.total || 0,
      userEmail: order.userEmail || '',
      cartId: order.cartId || 0,
      orderDetails: Array.isArray(details)
        ? details.map((detail) => this.normalizeOrderDetail(detail))
        : [],
    };
  }

  private normalizeOrderDetail(detail: any) {
    if (!detail) {
      return this.getEmptyOrderDetail();
    }

    return {
      idOrderDetail: detail.idOrderDetail || 0,
      orderId: detail.orderId || 0,
      recordId: detail.recordId || 0,
      recordTitle:
        detail.recordTitle || `Record ${detail.recordId || 'Unknown'}`,
      amount: detail.amount || 0,
      price: detail.price || 0,
      total: detail.total || (detail.amount || 0) * (detail.price || 0),
    };
  }

  private getEmptyOrder(): IOrder {
    return {
      idOrder: 0,
      orderDate: new Date().toISOString(),
      paymentMethod: '',
      total: 0,
      userEmail: '',
      cartId: 0,
      orderDetails: [],
    };
  }

  private getEmptyOrderDetail() {
    return {
      idOrderDetail: 0,
      orderId: 0,
      recordId: 0,
      recordTitle: 'Unknown Record',
      amount: 0,
      price: 0,
      total: 0,
    };
  }
}
