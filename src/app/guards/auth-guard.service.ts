import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ILoginResponse } from '../interfaces/login.interface';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private router: Router) {}

  getRole(): string {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user: ILoginResponse = JSON.parse(userData);
      return user.role || '';
    }
    return '';
  }

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('user');
  }

  getUser(): string {
    const infoUser = sessionStorage.getItem('user');
    if (infoUser) {
      const userInfo: ILoginResponse = JSON.parse(infoUser);
      return userInfo.email;
    }
    return '';
  }

  getToken(): string {
    const infoUser = sessionStorage.getItem('user');
    if (infoUser) {
      const userInfo: ILoginResponse = JSON.parse(infoUser);
      return userInfo.token;
    }
    return '';
  }

  getCartId(): number | null {
    // If the user is an administrator, return 0
    if (this.getRole() === 'Admin') {
      return 0;
    }

    // First try to get cartId from session storage
    const storedCartId = sessionStorage.getItem('cartId');
    if (storedCartId) {
      const cartId = Number(storedCartId);
      if (!isNaN(cartId)) {
        console.log('Found cart ID in session storage:', cartId);
        return cartId;
      }
    }

    // If not in session storage, try to get it from the token
    const token = this.getToken();
    if (!token) {
      console.warn('No token found when trying to get cart ID');
      return null;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      
      // Try different possible claim names for cart ID
      const cartId = decodedToken['CartId'] || 
                    decodedToken['cartId'] || 
                    decodedToken['cartid'] || 
                    decodedToken['cart_id'] ||
                    decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      
      if (cartId === undefined || cartId === null) {
        return null;
      }
      
      // Convert to number if it's a string
      const cartIdNum = typeof cartId === 'string' ? parseInt(cartId, 10) : Number(cartId);
      
      if (isNaN(cartIdNum)) {
        console.warn('Cart ID is not a valid number:', cartId);
        return null;
      }
      
      // Store in session storage for future use
      sessionStorage.setItem('cartId', cartIdNum.toString());
      return cartIdNum;
      
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
}
