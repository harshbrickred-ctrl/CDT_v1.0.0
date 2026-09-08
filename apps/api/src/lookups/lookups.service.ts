import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLookupValueDto, UpdateLookupValueDto } from './dto/lookups.dto';
import { throwConflictIfUnique } from '../common/prisma-error';

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lookupType.findMany({
      orderBy: { code: 'asc' },
      include: {
        values: {
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        },
      },
    });
  }

  async findByTypeCode(typeCode: string) {
    const code = typeCode.trim().toUpperCase();
    const type = await this.prisma.lookupType.findUnique({
      where: { code },
      include: {
        values: {
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        },
      },
    });
    if (!type) throw new NotFoundException(`Lookup type ${code} not found`);
    return type.values;
  }

  async createValue(dto: CreateLookupValueDto) {
    const type = await this.prisma.lookupType.findUnique({
      where: { id: dto.typeId },
    });
    if (!type) throw new NotFoundException('Lookup type not found');
    try {
      return await this.prisma.lookupValue.create({
        data: {
          typeId: dto.typeId,
          code: dto.code.trim().toUpperCase(),
          label: dto.label.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e) {
      throwConflictIfUnique(e, 'Lookup value code already exists for this type');
    }
  }

  async updateValue(id: string, dto: UpdateLookupValueDto) {
    const existing = await this.prisma.lookupValue.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Lookup value not found');
    return this.prisma.lookupValue.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
