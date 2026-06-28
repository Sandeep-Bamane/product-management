import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueId(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
      const id = `CAT-${suffix}`;
      const existing = await this.prisma.category.findUnique({ where: { uniqueId: id } });
      if (!existing) return id;
    }
    throw new Error('Could not generate unique category ID');
  }

  private includeAudit() {
    return {
      createdBy: { select: { id: true, email: true } },
      updatedBy: { select: { id: true, email: true } },
    };
  }

  async create(dto: CreateCategoryDto, userId?: string) {
    const exists = await this.prisma.category.findFirst({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Category name already exists');
    const uniqueId = await this.generateUniqueId();
    return this.prisma.category.create({
      data: { uniqueId, name: dto.name, createdById: userId },
      include: this.includeAudit(),
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.includeAudit(),
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.includeAudit(),
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, userId?: string) {
    await this.findOne(id);
    if (dto.name) {
      const conflict = await this.prisma.category.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) throw new BadRequestException('Category name already exists');
    }
    return this.prisma.category.update({
      where: { id },
      data: { ...dto, updatedById: userId },
      include: this.includeAudit(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const hasProducts = await this.prisma.product.count({ where: { categoryId: id } });
    if (hasProducts > 0) {
      throw new BadRequestException('Cannot delete category with existing products');
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
