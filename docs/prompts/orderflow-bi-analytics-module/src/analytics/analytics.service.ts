import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductRankingQueryDto, SortByField } from './dto/product-ranking-query.dto';
import {
  IProductMatrixResponse,
  IProductMatrixRow,
  IMonthlyMetric,
  IExecutiveSummaryResponse,
} from './interfaces/analytics.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera la matriz comparativa de productos (Mes x Mes / Año x Año)
   */
  async getProductRankingMatrix(
    tenantId: string,
    query: ProductRankingQueryDto,
  ): Promise<IProductMatrixResponse> {
    const { years = [2025, 2026], startMonth = 1, endMonth = 12, categoryId, sortBy, limit } = query;

    // Generar lista de periodos requeridos: "YYYY-MM"
    const periods: string[] = [];
    for (const year of years) {
      for (let m = startMonth; m <= endMonth; m++) {
        periods.push(`${year}-${String(m).padStart(2, '0')}`);
      }
    }

    // Consulta SQL agregada directa a PostgreSQL con aislamiento por tenantId
    const rawData: Array<{
      product_id: string;
      product_name: string;
      category_name: string | null;
      period: string;
      total_quantity: string | number;
      total_revenue: string | number;
    }> = await this.prisma.$queryRaw`
      SELECT 
        oi.product_id,
        COALESCE(p.name, oi.name, 'Producto Desconocido') AS product_name,
        c.name AS category_name,
        TO_CHAR(o.created_at, 'YYYY-MM') AS period,
        SUM(oi.quantity)::NUMERIC AS total_quantity,
        SUM(oi.unit_price * oi.quantity)::NUMERIC AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.status NOT IN ('CANCELLED', 'DRAFT')
        AND EXTRACT(YEAR FROM o.created_at) = ANY(${years}::int[])
        AND EXTRACT(MONTH FROM o.created_at) >= ${startMonth}
        AND EXTRACT(MONTH FROM o.created_at) <= ${endMonth}
        ${categoryId ? this.prisma.$queryRaw`AND p.category_id = ${categoryId}::uuid` : this.prisma.$queryRaw``}
      GROUP BY oi.product_id, product_name, c.name, TO_CHAR(o.created_at, 'YYYY-MM')
    `;

    // Mapeo matricial
    const productMap = new Map<string, IProductMatrixRow>();
    const grandMonthlyTotals: Record<string, IMonthlyMetric> = {};

    periods.forEach((period) => {
      grandMonthlyTotals[period] = { quantity: 0, revenue: 0 };
    });

    for (const item of rawData) {
      const pId = item.product_id || item.product_name;
      const qty = parseFloat(item.total_quantity?.toString() || '0');
      const rev = parseFloat(item.total_revenue?.toString() || '0');
      const period = item.period;

      if (!productMap.has(pId)) {
        const initialMonthlyData: Record<string, IMonthlyMetric> = {};
        periods.forEach((p) => {
          initialMonthlyData[p] = { quantity: 0, revenue: 0 };
        });

        productMap.set(pId, {
          productId: item.product_id,
          productName: item.product_name,
          categoryName: item.category_name || 'Sin Categoría',
          monthlyData: initialMonthlyData,
          totalQuantity: 0,
          totalRevenue: 0,
        });
      }

      const row = productMap.get(pId)!;
      if (row.monthlyData[period]) {
        row.monthlyData[period].quantity += qty;
        row.monthlyData[period].revenue += rev;
      }
      row.totalQuantity += qty;
      row.totalRevenue += rev;

      if (grandMonthlyTotals[period]) {
        grandMonthlyTotals[period].quantity += qty;
        grandMonthlyTotals[period].revenue += rev;
      }
    }

    // Ordenamiento por volumen o facturación
    const rows = Array.from(productMap.values());
    if (sortBy === SortByField.QUANTITY) {
      rows.sort((a, b) => b.totalQuantity - a.totalQuantity);
    } else {
      rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    const limitedRows = rows.slice(0, limit);

    const accumulatedQuantity = Object.values(grandMonthlyTotals).reduce((acc, curr) => acc + curr.quantity, 0);
    const accumulatedRevenue = Object.values(grandMonthlyTotals).reduce((acc, curr) => acc + curr.revenue, 0);

    return {
      periods,
      grandTotals: {
        monthlyTotals: grandMonthlyTotals,
        accumulatedQuantity,
        accumulatedRevenue,
      },
      rows: limitedRows,
    };
  }

  /**
   * Resumen Ejecutivo de KPIs
   */
  async getExecutiveSummary(
    tenantId: string,
    currentYear = 2026,
    previousYear = 2025,
  ): Promise<IExecutiveSummaryResponse> {
    const metrics: Array<{
      year: number;
      total_revenue: string | number;
      total_units: string | number;
      total_orders: string | number;
    }> = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(YEAR FROM o.created_at)::INT AS year,
        COALESCE(SUM(o.total), 0)::NUMERIC AS total_revenue,
        COALESCE(SUM(oi.quantity), 0)::NUMERIC AS total_units,
        COUNT(DISTINCT o.id)::INT AS total_orders
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.status NOT IN ('CANCELLED', 'DRAFT')
        AND EXTRACT(YEAR FROM o.created_at) IN (${currentYear}, ${previousYear})
      GROUP BY EXTRACT(YEAR FROM o.created_at)
    `;

    const current = metrics.find((m) => m.year === currentYear);
    const previous = metrics.find((m) => m.year === previousYear);

    const currentRevenue = parseFloat(current?.total_revenue?.toString() || '0');
    const previousRevenue = parseFloat(previous?.total_revenue?.toString() || '0');
    const totalUnits = parseFloat(current?.total_units?.toString() || '0');
    const totalOrders = current?.total_orders || 0;
    const averageTicket = totalOrders > 0 ? currentRevenue / totalOrders : 0;

    const yoyGrowthPercentage =
      previousRevenue > 0
        ? parseFloat((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2))
        : 0;

    // Top Producto del año actual
    const topProducts: Array<{
      product_id: string;
      product_name: string;
      total_quantity: string | number;
      total_revenue: string | number;
    }> = await this.prisma.$queryRaw`
      SELECT 
        oi.product_id,
        COALESCE(p.name, oi.name) AS product_name,
        SUM(oi.quantity)::NUMERIC AS total_quantity,
        SUM(oi.unit_price * oi.quantity)::NUMERIC AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.status NOT IN ('CANCELLED', 'DRAFT')
        AND EXTRACT(YEAR FROM o.created_at) = ${currentYear}
      GROUP BY oi.product_id, product_name
      ORDER BY total_revenue DESC
      LIMIT 1
    `;

    const top = topProducts[0];

    return {
      currentPeriodRevenue: currentRevenue,
      previousPeriodRevenue: previousRevenue,
      yoyGrowthPercentage,
      totalUnitsSold: totalUnits,
      totalOrdersCount: totalOrders,
      averageTicket: Math.round(averageTicket),
      topSellingProduct: top
        ? {
            id: top.product_id,
            name: top.product_name,
            quantity: parseFloat(top.total_quantity?.toString() || '0'),
            revenue: parseFloat(top.total_revenue?.toString() || '0'),
          }
        : null,
    };
  }
}
