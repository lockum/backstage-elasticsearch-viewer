import React from 'react';
import { Chip } from '@material-ui/core';
import { Table, TableColumn } from '@backstage/core-components';
import { IndexSummary } from '../../api/types';
import { StatusBadge } from '../StatusBadge';
import { formatDate, formatNumber } from '../common/formatters';

export interface RecentIndicesTableProps {
  indices: IndexSummary[];
  indexPattern?: string;
}

export const RecentIndicesTable: React.FC<RecentIndicesTableProps> = ({
  indices,
  indexPattern,
}) => {
  const columns: TableColumn<IndexSummary>[] = [
    {
      title: 'Index Name',
      field: 'name',
      highlight: true,
      render: row => <code>{row.name}</code>,
    },
    {
      title: 'Health',
      field: 'health',
      render: row => <StatusBadge status={row.health} />,
    },
    {
      title: 'Status',
      field: 'status',
      render: row => (
        <Chip
          label={row.status}
          size="small"
          variant={row.status === 'open' ? 'default' : 'outlined'}
          color={row.status === 'open' ? 'primary' : 'default'}
        />
      ),
    },
    {
      title: 'Documents',
      field: 'docsCount',
      render: row => formatNumber(row.docsCount),
    },
    {
      title: 'Storage Size',
      field: 'storeSizeFormatted',
      render: row => row.storeSizeFormatted || '—',
    },
    {
      title: 'Created Date',
      field: 'creationDate',
      render: row => formatDate(row.creationDate),
    },
  ];

  const tableTitle = indexPattern
    ? `Latest 7 Indices matching "${indexPattern}"`
    : 'Recent Cluster Indices';

  return (
    <Table
      title={tableTitle}
      options={{
        search: false,
        paging: false,
        toolbar: true,
        padding: 'dense',
      }}
      columns={columns}
      data={indices}
      emptyContent={
        <div style={{ padding: 24, textAlign: 'center' }}>
          No indices found matching pattern &quot;{indexPattern}&quot;.
        </div>
      }
    />
  );
};
