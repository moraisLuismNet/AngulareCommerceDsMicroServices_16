import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ILogin, ILoginResponse } from 'src/app/interfaces/login.interface';
import { AppService } from 'src/app/services/app.service';
import { AuthGuard } from 'src/app/guards/auth-guard.service';
import { UserService } from 'src/app/services/user.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [MessageService],
})
export class LoginComponent implements OnInit {
  infoLogin: ILogin = {
    email: '',
    password: '',
    role: '',
  };

  constructor(
    private router: Router,
    private appService: AppService,
    private messageService: MessageService,
    private authGuard: AuthGuard,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.userService.setEmail(this.infoLogin.email);
    if (this.authGuard.isLoggedIn()) {
      this.router.navigateByUrl('/ecommerce/listgroups');
    }
  }

  login() {
    this.appService.login(this.infoLogin).subscribe({
      next: (data: ILoginResponse) => {
        const decodedToken: any = jwtDecode(data.token);
        const role = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const email = this.infoLogin.email;
        
        const userData = { 
          ...data, 
          role, 
          email,
          name: email.split('@')[0] 
        };
        
        sessionStorage.setItem('user', JSON.stringify(userData));
        
        this.userService.setEmail(email);
        this.userService.setRole(role);
        
        // Redirect based on role
        this.userService.redirectBasedOnRole();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Incorrect credentials',
        });
      },
    });
  }
}
