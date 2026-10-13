export interface IMonthlyMetric {
  quantity: number;
  revenue: number;
}

export interface IProductMatrixRow {
  productId: string;
  productName: string;
  categoryName: string;
  monthlyData: Record<string, IMonthlyMetric>;
  totalQuantity: number;
  totalRevenue: number;
}

export interface IProductMatrixResponse {
  periods: string[];
  grandTotals: {
    monthlyTotals: Record<string, IMonthlyMetric>;
    accumulatedQuantity: number;
    accumulatedRevenue: number;
  };
  rows: IProductMatrixRow[];
}

export interface IExecutiveSummaryResponse {
  currentPeriodRevenue: number;
  previousPeriodRevenue: number;
  yoyGrowthPercentage: number;
  totalUnitsSold: number;
  totalOrdersCount: number;
  averageTicket: number;
  topSellingProduct: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  } | null;
}
