import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  getAll() {
    return this.http.get<ApiResponse<Category[]>>(this.base).pipe(map((r) => r.data));
  }

  getOne(id: string) {
    return this.http.get<ApiResponse<Category>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  create(dto: CreateCategoryDto) {
    return this.http.post<ApiResponse<Category>>(this.base, dto).pipe(map((r) => r.data));
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.http.put<ApiResponse<Category>>(`${this.base}/${id}`, dto).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
}
