import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { RegisterComponent } from './register/register.component';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  declarations: [NavbarComponent, LoginComponent, RegisterComponent],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastModule,
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
  ],
  exports: [NavbarComponent],
  providers: [MessageService],
})
export class SharedModule {}
