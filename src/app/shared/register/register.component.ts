import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { IRegister } from 'src/app/interfaces/register.interface';
import { AppService } from 'src/app/services/app.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  providers: [MessageService],
})
export class RegisterComponent {
  usuario: IRegister = { email: '', password: '' };
  registrationError: string | null = null;

  constructor(
    private appService: AppService,
    private router: Router,
    private messageService: MessageService
  ) {}

  onSubmit(form: any) {
    if (form.valid) {
      this.appService.register(this.usuario).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Registration successful',
            detail: 'User successfully registered',
          });

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500); // Wait 1.5 seconds before redirecting
        },
        error: (err) => {
          console.error('Error registering user:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Registration error',
            detail: 'The user could not be registered. Please try again.',
          });
        },
      });
    }
  }
}
