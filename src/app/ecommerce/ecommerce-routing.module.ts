import { Routes, RouterModule } from '@angular/router';
import { EcommerceComponent } from './ecommerce.component';
import { GenresComponent } from './genres/genres.component';
import { NgModule } from '@angular/core';
import { GroupsComponent } from './groups/groups.component';
import { RecordsComponent } from './records/records.component';
import { ListrecordsComponent } from './listrecords/listrecords.component';
import { CartDetailsComponent } from './cart-details/cart-details.component';
import { CartsComponent } from './carts/carts.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';
import { ListgroupsComponent } from './listgroups/listgroups.component';
import { UsersComponent } from './users/users.component';

const appRoutes: Routes = [
  {
    path: '',
    component: EcommerceComponent,
    children: [
      // Public routes
      { path: '', component: ListgroupsComponent },
      { path: 'listrecords/:idGroup', component: ListrecordsComponent },

      // Protected routes (would need AuthGuard)
      { path: 'listgroups', component: ListgroupsComponent },
      { path: 'genres', component: GenresComponent },
      { path: 'groups', component: GroupsComponent },
      { path: 'records', component: RecordsComponent },
      { path: 'cart-details', component: CartDetailsComponent },
      { path: 'carts', component: CartsComponent },
      { path: 'admin-orders', component: AdminOrdersComponent },
      { path: 'users', component: UsersComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(appRoutes)],
  exports: [RouterModule],
})
export class EcommerceRoutingModule {}
