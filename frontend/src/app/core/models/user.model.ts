export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
}
