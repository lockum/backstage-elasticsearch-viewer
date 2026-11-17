import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  LinearProgress,
  Typography,
  makeStyles,
} from '@material-ui/core';
import StorageIcon from '@material-ui/icons/Storage';
import MemoryIcon from '@material-ui/icons/Memory';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import { SearchClusterSummary } from '../../api/types';
import { StatusBadge } from '../StatusBadge';
import { formatBytes, formatNumber } from '../common/formatters';

const useStyles = makeStyles(theme => ({
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: theme.shadows[1],
  },
  cardHeader: {
    paddingBottom: theme.spacing(1),
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  metricValue: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
}));

export interface ClusterSummaryGridProps {
  summary: SearchClusterSummary;
}

export const ClusterSummaryGrid: React.FC<ClusterSummaryGridProps> = ({ summary }) => {
  const classes = useStyles();
  const { health, version, storage, engineType, instanceName } = summary;

  const engineLabel = engineType === 'opensearch' ? 'OpenSearch' : 'Elasticsearch';
  const engineColor = engineType === 'opensearch' ? 'primary' : 'secondary';

  return (
    <Grid container spacing={3}>
      {/* 1. Health Card */}
      <Grid item xs={12} md={4}>
        <Card className={classes.card}>
          <CardHeader
            className={classes.cardHeader}
            avatar={<CheckCircleOutlineIcon color="primary" />}
            title="Cluster Health"
            action={<StatusBadge status={health.status} />}
          />
          <CardContent>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Total Nodes</Typography>
              <Typography className={classes.metricValue}>
                {health.numberOfNodes} ({health.numberOfDataNodes} data)
              </Typography>
            </Box>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Active Primary Shards</Typography>
              <Typography className={classes.metricValue}>
                {health.activePrimaryShards}
              </Typography>
            </Box>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Total Active Shards</Typography>
              <Typography className={classes.metricValue}>
                {health.activeShards}
              </Typography>
            </Box>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Unassigned Shards</Typography>
              <Typography
                className={classes.metricValue}
                style={{ color: health.unassignedShards > 0 ? '#d32f2f' : 'inherit' }}
              >
                {health.unassignedShards}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 2. Version & Engine Info Card */}
      <Grid item xs={12} md={4}>
        <Card className={classes.card}>
          <CardHeader
            className={classes.cardHeader}
            avatar={<StorageIcon color="action" />}
            title="Cluster Info"
            action={
              <Chip
                label={engineLabel}
                size="small"
                color={engineColor}
                style={{ fontWeight: 700 }}
              />
            }
          />
          <CardContent>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Instance Name</Typography>
              <Typography className={classes.metricValue}>
                <code>{instanceName}</code>
              </Typography>
            </Box>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Engine Version</Typography>
              <Typography className={classes.metricValue}>
                {version.distribution ? `${version.distribution} ` : ''}
                {version.number}
              </Typography>
            </Box>
            {version.luceneVersion && (
              <Box className={classes.metricRow}>
                <Typography className={classes.metricLabel}>Lucene Version</Typography>
                <Typography className={classes.metricValue}>
                  {version.luceneVersion}
                </Typography>
              </Box>
            )}
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Cluster Name</Typography>
              <Typography className={classes.metricValue}>
                {summary.clusterName}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 3. Resource & Storage Usage Card */}
      <Grid item xs={12} md={4}>
        <Card className={classes.card}>
          <CardHeader
            className={classes.cardHeader}
            avatar={<MemoryIcon color="action" />}
            title="Resource & Storage"
          />
          <CardContent>
            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Disk Storage Used</Typography>
              <Typography className={classes.metricValue}>
                {formatBytes(storage.usedBytes)} / {formatBytes(storage.totalBytes)} ({storage.usedPercent}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, storage.usedPercent)}
              className={classes.progressBar}
              color={storage.usedPercent > 85 ? 'secondary' : 'primary'}
            />

            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Indices Store Size</Typography>
              <Typography className={classes.metricValue}>
                {formatBytes(storage.indicesStoreSizeBytes)}
              </Typography>
            </Box>

            <Box className={classes.metricRow}>
              <Typography className={classes.metricLabel}>Total Documents</Typography>
              <Typography className={classes.metricValue}>
                {formatNumber(storage.totalDocs)}
              </Typography>
            </Box>

            {storage.jvmHeapUsedPercent !== undefined && (
              <>
                <Box className={classes.metricRow} style={{ marginTop: 8 }}>
                  <Typography className={classes.metricLabel}>JVM Heap</Typography>
                  <Typography className={classes.metricValue}>
                    {storage.jvmHeapUsedPercent}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, storage.jvmHeapUsedPercent)}
                  className={classes.progressBar}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
