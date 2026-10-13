// frontend/src/pages/admin/omnipulse/SourcesList.tsx
import React from 'react';
import { useTable, List } from '@refinedev/antd';
import { Table, Progress, Tag, Tooltip } from 'antd';

interface IntelSource {
  id: string;
  name: string;
  role: string;
  reliabilityScore: number;
  totalReports: number;
  isToxicChannel: boolean;
  toxicFlagReason?: string;
}

const scoreColor = (score: number) => {
  if (score > 70) return '#3f8600';
  if (score >= 40) return '#faad14';
  return '#cf1322';
};

export const SourcesList: React.FC = () => {
  const { tableProps } = useTable<IntelSource>({
    resource: 'sources',
    meta: { resource: 'api/v1/pulse/sources' },
  });

  return (
    <List title="Fuentes de Información">
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Nombre" dataIndex="name" />
        <Table.Column title="Rol" dataIndex="role" />
        <Table.Column
          title="Confiabilidad"
          dataIndex="reliabilityScore"
          render={(score: number) => (
            <Progress
              percent={Math.round(score)}
              strokeColor={scoreColor(score)}
              size="small"
            />
          )}
        />
        <Table.Column title="Reportes" dataIndex="totalReports" />
        <Table.Column
          title="Estado"
          dataIndex="isToxicChannel"
          render={(isToxic: boolean, record: IntelSource) =>
            isToxic ? (
              <Tooltip title={record.toxicFlagReason}>
                <Tag color="red">Fuente Tóxica</Tag>
              </Tooltip>
            ) : (
              <Tag color="green">Confiable</Tag>
            )
          }
        />
      </Table>
    </List>
  );
};
