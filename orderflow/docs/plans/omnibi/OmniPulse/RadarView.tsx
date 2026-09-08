// frontend/src/pages/admin/omnipulse/RadarView.tsx
import React from 'react';
import { useCustom } from '@refinedev/core';
import { Card, Col, Row, Statistic, Alert } from 'antd';

export const RadarView: React.FC = () => {
  const { data, isLoading } = useCustom({
    url: '/api/v1/pulse/radar',
    method: 'get',
  });

  const summary = data?.data as
    | {
        avgReliabilityScore: number;
        toxicSourcesCount: number;
        totalInsights: number;
        unverifiedInsights: number;
      }
    | undefined;

  return (
    <div>
      <h2>Radar de Inteligencia de Mercado</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Confiabilidad Promedio de Fuentes"
              value={summary?.avgReliabilityScore ?? 0}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Fuentes Tóxicas Detectadas"
              value={summary?.toxicSourcesCount ?? 0}
              valueStyle={{ color: (summary?.toxicSourcesCount ?? 0) > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic title="Insights Totales" value={summary?.totalInsights ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic title="Pendientes de Verificar" value={summary?.unverifiedInsights ?? 0} />
          </Card>
        </Col>
      </Row>

      {(summary?.unverifiedInsights ?? 0) > 5 && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          message="Hay varios insights sin verificar"
          description="Verificar los reportes pendientes mejora la precisión del scoring de fuentes."
        />
      )}

      {/* TODO: Matriz de Veracidad — gráfico Rumores vs Ventas Reales.
          Sugerido: recharts, cruzando MarketInsight.salesImpactCorrel
          por categoría contra el volumen real de ventas del período. */}
    </div>
  );
};
