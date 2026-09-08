// frontend/src/pages/admin/omnipulse/StrategicProbes.tsx
import React from 'react';
import { useTable, List } from '@refinedev/antd';
import { useUpdate } from '@refinedev/core';
import { Table, Tag, Button, Space, Popconfirm } from 'antd';

interface StrategicProbe {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'TRIGGERED' | 'CONCLUDED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  riskFlag: boolean;
  justification: string;
}

const approvalColor: Record<StrategicProbe['approvalStatus'], string> = {
  PENDING: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
};

export const StrategicProbes: React.FC = () => {
  const { tableProps } = useTable<StrategicProbe>({
    resource: 'probes',
    meta: { resource: 'api/v1/pulse/probes' },
  });
  const { mutate: review } = useUpdate();

  return (
    <List title="Operaciones de Sondeo (Pilar 3 — solo información veraz)">
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Título" dataIndex="title" />
        <Table.Column title="Justificación" dataIndex="justification" ellipsis />
        <Table.Column
          title="Aprobación"
          dataIndex="approvalStatus"
          render={(status: StrategicProbe['approvalStatus'], record) => (
            <Space>
              <Tag color={approvalColor[status]}>{status}</Tag>
              {record.riskFlag && <Tag color="orange">Riesgo</Tag>}
            </Space>
          )}
        />
        <Table.Column title="Estado" dataIndex="status" />
        <Table.Column
          title="Acciones"
          render={(_, record: StrategicProbe) =>
            record.approvalStatus === 'PENDING' && (
              <Space>
                <Popconfirm
                  title="¿Aprobar esta sonda?"
                  onConfirm={() =>
                    review({
                      resource: 'api/v1/pulse/probes',
                      id: `${record.id}/review`,
                      values: { approve: true },
                    })
                  }
                >
                  <Button size="small" type="primary">
                    Aprobar
                  </Button>
                </Popconfirm>
                <Button size="small" danger>
                  Rechazar
                </Button>
              </Space>
            )
          }
        />
      </Table>
    </List>
  );
};
