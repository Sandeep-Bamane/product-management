import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User, CreateUserDto, UpdateUserDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  getAll() {
    return this.http.get<ApiResponse<User[]>>(this.base).pipe(map((r) => r.data));
  }

  getOne(id: string) {
    return this.http.get<ApiResponse<User>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  create(dto: CreateUserDto) {
    return this.http.post<ApiResponse<User>>(this.base, dto).pipe(map((r) => r.data));
  }

  update(id: string, dto: UpdateUserDto) {
    return this.http.put<ApiResponse<User>>(`${this.base}/${id}`, dto).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
}
