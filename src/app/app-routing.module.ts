import { inject, NgModule } from '@angular/core';
import { Routes, RouterModule, Router } from '@angular/router';
import { AuthGuard } from './guards/auth-guard.service';
import { LoginComponent } from './shared/login/login.component';
import { RegisterComponent } from './shared/register/register.component';
import { ListrecordsComponent } from './ecommerce/listrecords/listrecords.component';
import { OrdersComponent } from './ecommerce/orders/orders.component';
import { CartDetailsComponent } from './ecommerce/cart-details/cart-details.component';
import { CartsComponent } from './ecommerce/carts/carts.component';

const canActivate = () => {
  const guard = inject(AuthGuard);
  if (!guard.isLoggedIn()) {
    const router = inject(Router);
    router.navigate(['/login']);
    return false;
  }
  return true;
};

const appRoutes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'listrecords/:idGroup', component: ListrecordsComponent },
  { path: 'cart-details', component: CartDetailsComponent },
  // All ecommerce routes under the lazy loaded module
  {
    path: '',
    loadChildren: () =>
      import('./ecommerce/ecommerce.module').then((m) => m.EcommerceModule),
  },
  // Protected routes
  {
    path: '',
    canActivate: [canActivate],
    children: [
      { path: 'orders', component: OrdersComponent },
      { path: 'carts', component: CartsComponent },
      {
        path: 'ecommerce',
        loadChildren: () =>
          import('./ecommerce/ecommerce.module').then((m) => m.EcommerceModule),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
