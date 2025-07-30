import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, tap, map, catchError, throwError, of, switchMap } from "rxjs";
import { environment } from "src/environments/environment";
import { AuthGuard } from "src/app/guards/auth-guard.service";
import { IRecord } from "../ecommerce.interface";
import { StockService } from "./stock.service";

@Injectable({
  providedIn: "root",
})
export class RecordsService {
  private readonly baseUrl = environment.apiUrl.cdService;
  constructor(
    private http: HttpClient,
    private authGuard: AuthGuard,
    private stockService: StockService
  ) {}

  getRecords(): Observable<IRecord[]> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.baseUrl}records`, { headers }).pipe(
      map((response) => {
        // Handle different response formats
        let records: any[] = [];
        
        if (Array.isArray(response)) {
          // Case 1: Response is already an array
          records = response;
        } else if (response && typeof response === 'object') {
          // Case 2: Response has $values property
          if (Array.isArray(response.$values)) {
            records = response.$values;
          } 
          // Case 3: Response is an object with records as direct properties
          else if (Object.keys(response).length > 0) {
            records = Object.values(response);
          }
        }
        
        // Process records and update stock service
        return records.map(record => {
          const stock = typeof record.stock === 'number' ? record.stock : 0;
          // Update stock in the stock service
          this.stockService.updateStock(record.idRecord, stock);
          
          return {
            ...record,
            stock: stock
          };
        });
      }),
      tap((records) => {
        if (records.length > 0) {
          records.forEach((record) => {
            this.stockService.notifyStockUpdate(record.idRecord, record.stock || 0);
          });
        } else {
          console.log('[RecordsService] No records found');
        }
      }),
      catchError((error) => {
        console.error('[RecordsService] Error getting records:', {
          error,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        return of([]);
      })
    );
  }

  getRecordById(id: number): Observable<IRecord> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}records/${id}`;
    
    return this.http.get<IRecord>(url, { headers }).pipe(
      switchMap((record: IRecord) => {
        if (record.groupName || record.nameGroup) {
          console.log(`[RecordsService] Record ${id} already has group name:`, {
            groupId: record.groupId,
            groupName: record.groupName,
            nameGroup: record.nameGroup
          });
          return of(record);
        }
        
        // If it doesn't have a group name but it does have a groupId, we search for the group
        if (record.groupId) {
          const groupUrl = `${this.baseUrl}groups/${record.groupId}`;
          return this.http.get<{nameGroup?: string; groupName?: string}>(groupUrl, { headers }).pipe(
            map(groupResponse => {
              const groupName = groupResponse?.nameGroup || groupResponse?.groupName || 'Sin grupo';
              return {
                ...record,
                groupName: groupName,
                nameGroup: groupName
              } as IRecord;
            }),
            catchError(groupError => {
              console.error(`[RecordsService] Error getting group for record ${id}:`, groupError);
              return of({
                ...record,
                groupName: 'Error cargando grupo',
                nameGroup: 'Error cargando grupo'
              } as IRecord);
            })
          );
        }
        
        return of(record);
      }),
      catchError((error: any) => {
        console.error(`[RecordsService] Error getting record with id ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  addRecord(record: IRecord): Observable<IRecord> {
    const headers = this.getHeaders();
    const formData = new FormData();
    formData.append("titleRecord", record.titleRecord);
    if (record.yearOfPublication !== null) {
      formData.append("yearOfPublication", record.yearOfPublication.toString());
    } else {
      formData.append("yearOfPublication", "");
    }
    formData.append("photo", record.photo!);
    formData.append("price", record.price.toString());
    formData.append("stock", record.stock.toString());
    formData.append("discontinued", record.discontinued ? "true" : "false");
    formData.append("groupId", record.groupId?.toString()!);

    return this.http
      .post<any>(`${this.baseUrl}records`, formData, {
        headers,
      })
      .pipe(
        map((response) => {
          const newRecord = response.$values || {};
          return newRecord;
        }),
        tap((newRecord: IRecord) => {
          this.stockService.notifyStockUpdate(
            newRecord.idRecord,
            newRecord.stock
          );
        })
      );
  }

  updateRecord(record: IRecord): Observable<IRecord> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authGuard.getToken()}`,
    });
    const formData = new FormData();
    formData.append("titleRecord", record.titleRecord);
    if (record.yearOfPublication !== null) {
      formData.append("yearOfPublication", record.yearOfPublication.toString());
    } else {
      formData.append("yearOfPublication", "");
    }
    formData.append("price", record.price.toString());
    formData.append("stock", record.stock.toString());
    formData.append("discontinued", record.discontinued ? "true" : "false");
    formData.append("groupId", record.groupId?.toString()!);

    if (record.photo) {
      formData.append("photo", record.photo);
    }

    return this.http
      .put<any>(`${this.baseUrl}records/${record.idRecord}`, formData, {
        headers,
      })
      .pipe(
        map((response) => {
          const updatedRecord = response.$values || {};
          return updatedRecord;
        }),
        tap((updatedRecord: IRecord) => {
          this.stockService.notifyStockUpdate(
            updatedRecord.idRecord,
            updatedRecord.stock
          );
        })
      );
  }

  deleteRecord(id: number): Observable<IRecord> {
    const headers = this.getHeaders();
    return this.http
      .delete<any>(`${this.baseUrl}records/${id}`, {
        headers,
      })
      .pipe(
        map((response) => {
          const deletedRecord = response.$values || {};
          return deletedRecord;
        })
      );
  }

  getRecordsByGroup(idGroup: string | number): Observable<IRecord[]> {
    const headers = this.getHeaders();
    return this.http
      .get<any>(`${this.baseUrl}groups/recordsByGroup/${idGroup}`, { headers })
      .pipe(
        map((response) => {
          let records: IRecord[];
          let groupName = "";
          // Handle direct record array response
          if (Array.isArray(response)) {
            records = response;
          }
          // Handle $values wrapper
          else if (response && response.$values) {
            records = response.$values;
          }
          // Handle records nested in group response
          else if (
            response &&
            typeof response === "object" &&
            response.records
          ) {
            if (Array.isArray(response.records)) {
              records = response.records;
            } else if (response.records.$values) {
              records = response.records.$values;
            } else if (typeof response.records === "object") {
              records = Object.values(response.records).filter(
                (val): val is IRecord => {
                  if (!val || typeof val !== "object") return false;
                  const v = val as any;
                  return (
                    typeof v.idRecord === "number" &&
                    typeof v.titleRecord === "string" &&
                    typeof v.stock === "number"
                  );
                }
              );
            } else {
              records = [];
            }
          }
          // Handle single record response
          else if (
            response &&
            typeof response === "object" &&
            "idRecord" in response
          ) {
            records = [response];
          }
          // Handle other object responses
          else if (response && typeof response === "object") {
            const values = Object.values(response);
            records = values.filter((val): val is IRecord => {
              if (!val || typeof val !== "object") return false;
              const v = val as any;
              return (
                typeof v.idRecord === "number" &&
                typeof v.titleRecord === "string" &&
                typeof v.stock === "number"
              );
            });
          }
          // Default to empty array
          else {
            records = [];
          }

          // If the answer has the group name, save it.
          if (response && response.nameGroup) {
            groupName = response.nameGroup;
          } else if (
            response &&
            typeof response === "object" &&
            response.group &&
            response.group.nameGroup
          ) {
            groupName = response.group.nameGroup;
          }

          // Assign the group name to each record
          records.forEach((record) => {
            record.groupName = groupName || "";
          });

          return records;
        }),
        tap((records) => {
          records.forEach((record) => {
            if (record && record.idRecord && record.stock !== undefined) {
              this.stockService.notifyStockUpdate(
                record.idRecord,
                record.stock
              );
            }
          });
        })
      );
  }

  getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    });
  }

  decrementStock(idRecord: number): Observable<any> {
    console.log(`[RecordsService] Decrementing stock for record ${idRecord}`);
    const headers = this.getHeaders();
    const amount = -1;
    return this.http
      .put(
        `${this.baseUrl}records/${idRecord}/updateStock/${amount}`,
        {},
        { headers }
      )
      .pipe(
        tap(() => {
          console.log(`[RecordsService] Stock decremented for record ${idRecord}`);
          this.stockService.notifyStockUpdate(idRecord, amount);
        }),
        catchError((error) => {
          console.error(`[RecordsService] Error decrementing stock for record ${idRecord}:`, error);
          return throwError(() => error);
        })
      );
  }

  incrementStock(idRecord: number): Observable<any> {
    console.log(`[RecordsService] Incrementing stock for record ${idRecord}`);
    const headers = this.getHeaders();
    const amount = 1;
    return this.http
      .put(
        `${this.baseUrl}records/${idRecord}/updateStock/${amount}`,
        {},
        { headers }
      )
      .pipe(
        tap(() => {
          console.log(`[RecordsService] Stock incremented for record ${idRecord}`);
          this.stockService.notifyStockUpdate(idRecord, amount);
        }),
        catchError((error) => {
          console.error(`[RecordsService] Error incrementing stock for record ${idRecord}:`, error);
          return throwError(() => error);
        })
      );
  }
}
