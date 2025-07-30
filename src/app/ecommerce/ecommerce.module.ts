import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

// Components
import { EcommerceComponent } from './ecommerce.component';
import { RecordsComponent } from './records/records.component';
import { GenresComponent } from './genres/genres.component';
import { GroupsComponent } from './groups/groups.component';
import { ListgroupsComponent } from './listgroups/listgroups.component';
import { ListrecordsComponent } from './listrecords/listrecords.component';
import { CartDetailsComponent } from './cart-details/cart-details.component';
import { OrdersComponent } from './orders/orders.component';
import { CartsComponent } from './carts/carts.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';

// Modules
import { EcommerceRoutingModule } from './ecommerce-routing.module';
import { SharedModule } from '../shared/shared.module';

// Services
import { GenresService } from './services/genres.service';
import { GroupsService } from './services/groups.service';
import { RecordsService } from './services/records.service';
import { CartDetailService } from './services/cart-detail.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { StockService } from './services/stock.service';
import { UsersComponent } from './users/users.component';

const PRIME_NG_MODULES = [
  TableModule,
  ButtonModule,
  ConfirmDialogModule,
  DialogModule,
];

const COMPONENTS = [
  EcommerceComponent,
  RecordsComponent,
  GenresComponent,
  GroupsComponent,
  ListgroupsComponent,
  ListrecordsComponent,
  OrdersComponent,
  CartDetailsComponent,
  CartsComponent,
  AdminOrdersComponent,
];

@NgModule({
  declarations: [...COMPONENTS, UsersComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    EcommerceRoutingModule,
    SharedModule,
    ...PRIME_NG_MODULES,
  ],
  providers: [
    GenresService,
    GroupsService,
    RecordsService,
    CartDetailService,
    CartService,
    OrderService,
    StockService,
  ],
  exports: [...COMPONENTS],
})
export class EcommerceModule {}
