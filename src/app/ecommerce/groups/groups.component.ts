import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { IGroup } from '../ecommerce.interface';
import { GroupsService } from '../services/groups.service';
import { GenresService } from '../services/genres.service';

@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  providers: [ConfirmationService],
})
export class GroupsComponent implements OnInit {
  @ViewChild('form') form!: NgForm;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('groupsTable') groupsTable!: ElementRef<HTMLTableElement>;
  private genresLoaded = false;
  private pendingEditGroup: IGroup | null = null;
  visibleError = false;
  errorMessage = '';
  groups: IGroup[] = [];
  filteredGroups: IGroup[] = [];
  visibleConfirm = false;
  imageGroup = '';
  visiblePhoto = false;
  photo = '';
  searchText: string = '';

  group: IGroup = {
    idGroup: 0,
    nameGroup: '',
    imageGroup: null,
    photo: null,
    musicGenreId: null,
    musicGenreName: '',
    musicGenre: '',
  };

  genres: any[] = [];
  constructor(
    private cdr: ChangeDetectorRef,
    private groupsService: GroupsService,
    private genresService: GenresService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.getGroups();
    this.getGenres().then(() => {
    }).catch(err => {
      console.error('Failed to load genres:', err);
    });
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (data: any) => {

        // Directly assign the response array (without using .$values)
        this.groups = Array.isArray(data) ? data : [];
        this.filteredGroups = [...this.groups];
      },
      error: (err) => {
        console.error('Error fetching groups:', err);
        this.visibleError = true;
        this.errorMessage = 'Failed to load groups. Please try again.';
      },
    });
  }

  getGenres() {
    return new Promise<void>((resolve, reject) => {
      this.genresService.getGenres().subscribe({
        next: (data: any) => {
          // Handle different response formats
          let genresArray = [];
          if (Array.isArray(data)) {
            genresArray = data;
          } else if (data && Array.isArray(data.$values)) {
            genresArray = data.$values;
          } else if (data && data.data && Array.isArray(data.data)) {
            genresArray = data.data;
          }
          
          this.genres = genresArray;
          this.genresLoaded = true;
          
          // If there was a pending edit, process it now
          if (this.pendingEditGroup) {
            this.processEdit(this.pendingEditGroup);
            this.pendingEditGroup = null;
          }
          
          this.cdr.detectChanges();
          resolve();
        },
        error: (err) => {
          console.error('Error loading genres:', err);
          this.visibleError = true;
          this.errorMessage = 'Failed to load music genres. Please try again.';
          this.controlError(err);
          reject(err);
        },
      });
    });
  }

  filterGroups() {
    this.filteredGroups = this.groups.filter((group) =>
      group.nameGroup.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  onSearchChange() {
    this.filterGroups();
  }

  save() {
    if (this.group.idGroup === 0) {
      this.groupsService.addGroup(this.group).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.form.reset();
          this.getGroups();
        },
        error: (err) => {
          console.log(err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    } else {
      this.groupsService.updateGroup(this.group).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.form.reset();
          this.getGroups();
        },
        error: (err) => {
          this.visibleError = true;
          this.controlError(err);
        },
      });
    }
  }

  async edit(group: IGroup) {
    // If genres aren't loaded yet, store the group and wait for them to load
    if (!this.genresLoaded) {
      this.pendingEditGroup = group;
      try {
        await this.getGenres();
      } catch (error) {
        console.error('Error loading genres:', error);
      }
      return;
    }
    
    this.processEdit(group);
  }
  
  private processEdit(group: IGroup) {
    // Create a deep copy of the group to avoid reference issues
    this.group = { ...group };
    
    // Set the photo name if image exists
    this.group.photoName = group.imageGroup
      ? this.extractNameImage(group.imageGroup)
      : '';
    
    // Make sure musicGenreId is set to the correct value
    if (group.musicGenreId && this.genres.length > 0) {
      // Verify the genre exists in our list
      const foundGenre = this.genres.find(g => g.idMusicGenre === group.musicGenreId);
      if (foundGenre) {
        this.group.musicGenreId = foundGenre.idMusicGenre;
        this.group.musicGenreName = foundGenre.nameMusicGenre;
      } else {
        // Try to find by name if ID doesn't match
        this.tryFindGenreByName(group);
      }
    } else if (this.genres.length === 0) {
      // If no genres are loaded, try to reload them
      this.getGenres().then(() => {
        this.processEdit(group);
      });
      return;
    } else {
      // Try to find by name if no ID is provided
      this.tryFindGenreByName(group);
    }

    // Force change detection to update the view
    this.cdr.detectChanges();
  }
  
  private tryFindGenreByName(group: IGroup) {
    if (group.musicGenreName) {
      const foundGenre = this.genres.find(g => 
        g.nameMusicGenre?.toLowerCase() === group.musicGenreName?.toLowerCase()
      );
      
      if (foundGenre) {
        this.group.musicGenreId = foundGenre.idMusicGenre;
        this.group.musicGenreName = foundGenre.nameMusicGenre;
      } else {
        console.warn(`Genre with name '${group.musicGenreName}' not found`);
      }
    }
  }

  extractNameImage(url: string): string {
    return url.split('/').pop() || '';
  }

  cancelEdition() {
    this.group = {
      idGroup: 0,
      nameGroup: '',
      imageGroup: null,
      photo: null,
      musicGenreId: 0,
      musicGenreName: '',
      musicGenre: '',
    };
  }

  confirmDelete(group: IGroup) {
    this.confirmationService.confirm({
      message: `Delete the group ${group.nameGroup}?`,
      header: 'Are you sure?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteGroup(group.idGroup!),
    });
  }

  deleteGroup(id: number) {
    this.groupsService.deleteGroup(id).subscribe({
      next: (data) => {
        this.visibleError = false;
        this.form.reset({
          nameMusicGenre: '',
        });
        this.getGroups();
      },
      error: (err) => {
        this.visibleError = true;
        this.controlError(err);
      },
    });
  }

  controlError(err: any) {
    if (err.error && typeof err.error === 'object' && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === 'string') {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = 'An unexpected error has occurred';
    }
  }

  onChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.group.photo = file;
      this.group.photoName = file.name;
    }
  }

  showImage(group: IGroup) {
    if (this.visiblePhoto && this.group === group) {
      this.visiblePhoto = false;
    } else {
      this.group = group;
      this.photo = group.imageGroup!;
      this.visiblePhoto = true;
    }
  }
}
