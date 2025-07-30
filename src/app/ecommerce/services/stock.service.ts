import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private stockCache: { [key: number]: number } = {};
  private stockUpdateSubject = new BehaviorSubject<{ recordId: number; newStock: number } | null>(null);
  
  // Public observable for components to subscribe to
  stockUpdate$ = this.stockUpdateSubject.asObservable();

  // Update stock and notify subscribers
  updateStock(recordId: number, newStock: number): void {
    // Only update if the stock has actually changed
    if (this.stockCache[recordId] !== newStock) {
      this.stockCache[recordId] = newStock;
      this.stockUpdateSubject.next({ recordId, newStock });
    }
  }

  // Get current stock from cache
  getStock(recordId: number): number | null {
    return this.stockCache[recordId] ?? null;
  }

  // Alias for backward compatibility
  notifyStockUpdate(recordId: number, newStock: number): void {
    this.updateStock(recordId, newStock);
  }
}
