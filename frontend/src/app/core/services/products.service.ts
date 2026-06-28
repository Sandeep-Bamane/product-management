import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResult } from '../models/api-response.model';
import { Product, CreateProductDto, UpdateProductDto, ProductQuery } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  getAll(query: ProductQuery = {}) {
    const params: Record<string, string> = {};
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params[k] = String(v);
    });
    return this.http
      .get<ApiResponse<PaginatedResult<Product>>>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  getOne(id: string) {
    return this.http.get<ApiResponse<Product>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  create(dto: CreateProductDto, imageFile?: File) {
    const fd = new FormData();
    fd.append('name', dto.name);
    fd.append('price', String(dto.price));
    fd.append('categoryId', dto.categoryId);
    if (imageFile) fd.append('image', imageFile);
    return this.http.post<ApiResponse<Product>>(this.base, fd).pipe(map((r) => r.data));
  }

  update(id: string, dto: UpdateProductDto, imageFile?: File) {
    const fd = new FormData();
    if (dto.name) fd.append('name', dto.name);
    if (dto.price !== undefined) fd.append('price', String(dto.price));
    if (dto.categoryId) fd.append('categoryId', dto.categoryId);
    if (imageFile) fd.append('image', imageFile);
    return this.http.put<ApiResponse<Product>>(`${this.base}/${id}`, fd).pipe(map((r) => r.data));
  }

  remove(id: string) {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${this.base}/${id}`)
      .pipe(map((r) => r.data));
  }
}
