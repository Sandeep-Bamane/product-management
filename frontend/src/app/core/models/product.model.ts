import { Category } from './category.model';

export interface Product {
  id: string;
  uniqueId: string;
  name: string;
  image: string;
  price: number;
  categoryId: string;
  category: Pick<Category, 'id' | 'name' | 'uniqueId'>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  price: number;
  categoryId: string;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  categoryId?: string;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  categoryId?: string;
}
