import { Component, OnInit } from "@angular/core";
import { IUser } from "../ecommerce.interface";
import { UsersService } from "../services/users.service";
import { ConfirmationService, MessageService } from "primeng/api";

@Component({
  selector: "app-users",
  templateUrl: "./users.component.html",
  styleUrls: ["./users.component.css"],
})
export class UsersComponent implements OnInit {
  users: IUser[] = [];
  filteredUsers: IUser[] = [];
  loading = true;
  searchText = "";
  errorMessage = "";
  visibleError = false;

  constructor(
    private usersService: UsersService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: (error) => {
        console.error("Error loading users:", error);
        this.errorMessage = this.getErrorMessage(error);
        this.visibleError = true;
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
      },
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return "You don't have permission to view users. Please log in as an administrator.";
    }
    return "Error loading users. Please try again..";
  }

  confirmDelete(email: string): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the user "${email}"?<br/><span class="delete-warning" style="color: #dc3545; font-weight: bold;">This action cannot be undone!</span>`,
      header: "Delete User",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      rejectButtonStyleClass: "p-button-secondary",
      acceptIcon: "pi pi-check",
      acceptLabel: "Yes",
      rejectLabel: "No",
      accept: () => {
        this.deleteUser(email);
      },
    });
  }

  deleteUser(email: string): void {
    this.usersService.deleteUser(email).subscribe({
      next: () => {
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "User successfully deleted",
        });
        this.loadUsers();
      },
      error: (error) => {
        console.error("Error deleting user:", error);
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error deleting user",
        });
      },
    });
  }

  onSearchChange(): void {
    if (!this.searchText) {
      this.filteredUsers = [...this.users];
      return;
    }
    const searchTerm = this.searchText.toLowerCase();
    this.filteredUsers = this.users.filter((user) =>
      user.email.toLowerCase().includes(searchTerm)
    );
  }
}
