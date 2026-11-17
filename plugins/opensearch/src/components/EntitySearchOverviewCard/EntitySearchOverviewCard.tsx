import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Typography,
  makeStyles,
} from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import StorageIcon from '@material-ui/icons/Storage';
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
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  engineBadge: {
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginBottom: theme.spacing(0.25),
  },
  metricValue: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: theme.spacing(0.75),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  indexChip: {
    fontFamily: 'monospace',
    fontWeight: 600,
    fontSize: '0.8rem',
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

  // Memoize cluster config to avoid unstable references across re-renders
  const clusterConfig = useMemo(() => getSearchClusterConfig(entity), [entity]);
  const title = getSearchClusterTitle(entity);

  const instanceName = clusterConfig?.instanceName;
  const indexPattern = clusterConfig?.indexPattern;

  const [summary, setSummary] = useState<SearchClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable callback depending only on primitive strings
  const fetchSummary = useCallback(async () => {
    if (!instanceName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSummary({
        instanceName,
        indexPattern,
      });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [api, instanceName, indexPattern]);

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
      <InfoCard title={`${title} Health (${clusterConfig.instanceName})`}>
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={`${title} Health (${clusterConfig.instanceName})`}>
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

  // Matched indices statistics
  const matchedIndices = summary.indices || [];
  const matchedCount = matchedIndices.length;
  const totalMatchedDocs = matchedIndices.reduce(
    (sum, idx) => sum + (idx.docsCount || 0),
    0,
  );
  const worstIndexHealth = matchedIndices.some(i => i.health === 'red')
    ? 'red'
    : matchedIndices.some(i => i.health === 'yellow')
    ? 'yellow'
    : 'green';

  const handleNavigateToSearchCluster = () => {
    const namespace = entity.metadata.namespace || 'default';
    const kind = entity.kind.toLowerCase();
    const name = entity.metadata.name;
    navigate(`/catalog/${namespace}/${kind}/${name}/search-cluster`);
  };

  return (
    <InfoCard
      title={
        <Box className={classes.headerContainer}>
          <Box display="flex" alignItems="center" gridGap={8}>
            <StorageIcon fontSize="small" color="action" />
            <Typography variant="h6" component="span">
              {summary.clusterName}
            </Typography>
            <Chip
              label={`${engineLabel} ${summary.version.number}`}
              size="small"
              color={engineColor}
              className={classes.engineBadge}
            />
          </Box>
          <Box display="flex" alignItems="center" gridGap={8}>
            <StatusBadge status={summary.health.status} />
          </Box>
        </Box>
      }
      subheader={`Instance: ${summary.instanceName}`}
    >
      {/* 1. Cluster Health Section */}
      <Typography className={classes.sectionTitle}>
        Cluster Health
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <Typography className={classes.metricLabel}>Cluster Status</Typography>
          <Box display="flex" alignItems="center" gridGap={6}>
            <StatusBadge status={summary.health.status} />
            <Typography className={classes.metricValue}>
              {summary.health.status.toUpperCase()}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography className={classes.metricLabel}>Nodes & Shards</Typography>
          <Typography className={classes.metricValue}>
            {summary.health.numberOfNodes} nodes • {summary.health.activePrimaryShards} shards
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Typography className={classes.metricLabel}>Total Cluster Docs</Typography>
          <Typography className={classes.metricValue}>
            {formatNumber(summary.storage.totalDocs)}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography className={classes.metricLabel}>Cluster Disk Usage</Typography>
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

      <Divider className={classes.divider} />

      {/* 2. Index Health Section */}
      <Typography className={classes.sectionTitle}>
        Index Health
      </Typography>

      {indexPattern ? (
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <Typography className={classes.metricLabel}>Monitored Pattern</Typography>
            <Chip
              label={indexPattern}
              size="small"
              variant="outlined"
              color="primary"
              className={classes.indexChip}
            />
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography className={classes.metricLabel}>Indices Health</Typography>
            <Box display="flex" alignItems="center" gridGap={6}>
              <StatusBadge status={worstIndexHealth} />
              <Typography className={classes.metricValue}>
                {matchedCount} {matchedCount === 1 ? 'index' : 'indices'}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography className={classes.metricLabel}>Pattern Docs</Typography>
            <Typography className={classes.metricValue}>
              {formatNumber(totalMatchedDocs)}
            </Typography>
          </Grid>

          {matchedIndices.length > 0 && (
            <Grid item xs={12}>
              <Typography className={classes.metricLabel}>Latest Index</Typography>
              <Box display="flex" alignItems="center" gridGap={8} flexWrap="wrap">
                <code>{matchedIndices[0].name}</code>
                <StatusBadge status={matchedIndices[0].health} />
                <Typography variant="caption" color="textSecondary">
                  ({formatNumber(matchedIndices[0].docsCount)} docs, {matchedIndices[0].storeSizeFormatted})
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <Box py={1}>
          <Typography variant="body2" color="textSecondary">
            No <code>index_name</code> annotation configured. Add{' '}
            <code>index_name: your-pattern-*</code> to monitor specific index health.
          </Typography>
        </Box>
      )}

      {/* Footer Navigation Button */}
      <Box className={classes.footer}>
        <Button
          color="primary"
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          size="small"
          onClick={handleNavigateToSearchCluster}
        >
          View Full Search Cluster
        </Button>
      </Box>
    </InfoCard>
  );
};
