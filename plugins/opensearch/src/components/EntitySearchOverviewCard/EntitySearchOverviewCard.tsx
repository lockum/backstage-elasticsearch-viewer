import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Typography,
  makeStyles,
} from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { InfoCard, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { useNavigate } from 'react-router-dom';
import { searchClusterApiRef } from '../../api/SearchClusterApi';
import { SearchClusterSummary } from '../../api/types';
import {
  getSearchClusterConfig,
  getSearchClusterTitle,
} from '../common/annotations';
import { formatBytes, formatNumber } from '../common/formatters';
import { StatusBadge } from '../StatusBadge';

const useStyles = makeStyles(theme => ({
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  engineBadge: {
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginBottom: theme.spacing(0.5),
  },
  metricValue: {
    fontWeight: 600,
    fontSize: '1rem',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: theme.spacing(1),
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

export const EntitySearchOverviewCard = (): JSX.Element | null => {
  const classes = useStyles();
  const { entity } = useEntity();
  const api = useApi(searchClusterApiRef);
  const navigate = useNavigate();

  const clusterConfig = getSearchClusterConfig(entity);
  const title = getSearchClusterTitle(entity);

  const [summary, setSummary] = useState<SearchClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!clusterConfig) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSummary({
        instanceName: clusterConfig.instanceName,
        indexPattern: clusterConfig.indexPattern,
      });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [api, clusterConfig]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!clusterConfig) {
    return (
      <InfoCard title="Search Cluster">
        <Typography variant="body2" color="textSecondary">
          No Elasticsearch (<code>es_instance</code>) or OpenSearch (
          <code>os_instance</code>) annotation configured for this entity.
        </Typography>
      </InfoCard>
    );
  }

  if (loading) {
    return (
      <InfoCard title={`${title} (${clusterConfig.instanceName})`}>
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={`${title} (${clusterConfig.instanceName})`}>
        <ResponseErrorPanel error={error} />
      </InfoCard>
    );
  }

  if (!summary) {
    return null;
  }

  const engineLabel = summary.engineType === 'opensearch' ? 'OpenSearch' : 'Elasticsearch';
  const engineColor = summary.engineType === 'opensearch' ? 'primary' : 'secondary';
  const diskUsed = summary.storage.usedBytes;
  const diskTotal = summary.storage.totalBytes;
  const diskPercent = summary.storage.usedPercent;

  return (
    <InfoCard
      title={
        <Box className={classes.headerContainer}>
          <Box display="flex" alignItems="center" gridGap={8}>
            <Typography variant="h6" component="span">
              {summary.clusterName}
            </Typography>
            <Chip
              label={engineLabel}
              size="small"
              color={engineColor}
              className={classes.engineBadge}
            />
          </Box>
          <StatusBadge status={summary.health.status} />
        </Box>
      }
      subheader={`Instance: ${summary.instanceName}`}
    >
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <Typography className={classes.metricLabel}>Engine Version</Typography>
          <Typography className={classes.metricValue}>
            {summary.version.distribution ? `${summary.version.distribution} ` : 'v'}
            {summary.version.number}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography className={classes.metricLabel}>Nodes & Shards</Typography>
          <Typography className={classes.metricValue}>
            {summary.health.numberOfNodes} nodes / {summary.health.activePrimaryShards} shards
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Typography className={classes.metricLabel}>Total Documents</Typography>
          <Typography className={classes.metricValue}>
            {formatNumber(summary.storage.totalDocs)}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography className={classes.metricLabel}>Cluster Disk Storage</Typography>
            <Typography variant="body2" className={classes.metricValue}>
              {formatBytes(diskUsed)} / {formatBytes(diskTotal)} ({diskPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, diskPercent)}
            className={classes.progressBar}
            color={diskPercent > 85 ? 'secondary' : 'primary'}
          />
        </Grid>
      </Grid>

      <Box className={classes.footer}>
        <Button
          color="primary"
          endIcon={<ArrowForwardIcon />}
          size="small"
          onClick={() => navigate(summary.engineType === 'opensearch' ? 'opensearch' : 'elasticsearch')}
        >
          View Full {engineLabel} Details
        </Button>
      </Box>
    </InfoCard>
  );
};
