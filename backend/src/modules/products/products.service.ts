import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private includeAudit() {
    return {
      category:  { select: { id: true, name: true, uniqueId: true } },
      createdBy: { select: { id: true, email: true } },
      updatedBy: { select: { id: true, email: true } },
    };
  }

  private async generateUniqueId(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
      const id = `PRD-${suffix}`;
      const existing = await this.prisma.product.findUnique({ where: { uniqueId: id } });
      if (!existing) return id;
    }
    throw new Error('Could not generate unique product ID');
  }

  async create(dto: CreateProductDto, file?: Express.Multer.File, userId?: string) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    const uniqueId = await this.generateUniqueId();
    const image = file ? `/static/images/${file.filename}` : '';

    return this.prisma.product.create({
      data: { uniqueId, name: dto.name, price: dto.price, categoryId: dto.categoryId, image, createdById: userId },
      include: this.includeAudit(),
    });
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, sortBy, sortOrder, search, categoryId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: this.includeAudit(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.includeAudit(),
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto, file?: Express.Multer.File, userId?: string) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Category not found');
    }

    const data: any = { ...dto };
    if (file) data.image = `/static/images/${file.filename}`;
    if (userId) data.updatedById = userId;

    return this.prisma.product.update({
      where: { id },
      data,
      include: this.includeAudit(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }
}
