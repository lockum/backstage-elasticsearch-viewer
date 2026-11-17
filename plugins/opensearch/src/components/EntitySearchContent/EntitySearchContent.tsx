import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Grid,
  makeStyles,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import RefreshIcon from '@material-ui/icons/Refresh';
import { Content, Header, Page, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { searchClusterApiRef } from '../../api/SearchClusterApi';
import { SearchClusterSummary } from '../../api/types';
import {
  getSearchClusterConfig,
  getSearchClusterTitle,
} from '../common/annotations';
import { ClusterSummaryGrid } from './ClusterSummaryGrid';
import { RecentIndicesTable } from './RecentIndicesTable';

const useStyles = makeStyles(theme => ({
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(3),
  },
  alertContainer: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  spinning: {
    animation: '$spin 1s linear infinite',
  },
  '@keyframes spin': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
}));

export const EntitySearchContent = (): JSX.Element | null => {
  const classes = useStyles();
  const { entity } = useEntity();
  const api = useApi(searchClusterApiRef);

  // Memoize clusterConfig so reference remains stable across renders
  const clusterConfig = useMemo(() => getSearchClusterConfig(entity), [entity]);
  const engineTitle = getSearchClusterTitle(entity);

  const instanceName = clusterConfig?.instanceName;
  const indexPattern = clusterConfig?.indexPattern;

  const [summary, setSummary] = useState<SearchClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable callback depending only on primitive strings
  const loadData = useCallback(async (isRefresh = false) => {
    if (!instanceName) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }, [api, instanceName, indexPattern]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!clusterConfig) {
    return (
      <Page themeId="tool">
        <Header title="Search Cluster" subtitle="Cluster Metrics & Indices" />
        <Content>
          <Alert severity="info">
            No <code>es_instance</code> or <code>os_instance</code> annotation found on this entity.
            Add an annotation to <code>catalog-info.yaml</code> to enable cluster monitoring.
          </Alert>
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header
        title={`${engineTitle} Cluster`}
        subtitle={`Instance: ${clusterConfig.instanceName} • Entity: ${entity.metadata.name}`}
      >
        <Box className={classes.headerActions}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon className={refreshing ? classes.spinning : undefined} />}
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Header>

      <Content>
        {loading && <Progress />}

        {error && (
          <Box mb={2}>
            <ResponseErrorPanel error={error} />
          </Box>
        )}

        {summary && (
          <Grid container direction="column" spacing={3}>
            {/* Top Cluster Metrics Grid */}
            <Grid item xs={12}>
              <ClusterSummaryGrid summary={summary} />
            </Grid>

            {/* If index_name annotation is omitted, show informational alert */}
            {!clusterConfig.indexPattern && (
              <Grid item xs={12}>
                <Alert severity="info">
                  No <code>index_name</code> annotation is configured for this entity.
                  Cluster metrics are shown above. To monitor recent indices, configure{' '}
                  <code>index_name: your-index-*</code> in <code>catalog-info.yaml</code>.
                </Alert>
              </Grid>
            )}

            {/* Recent Indices Table if indices exist */}
            {summary.indices && summary.indices.length > 0 && (
              <Grid item xs={12} className={classes.section}>
                <RecentIndicesTable
                  indices={summary.indices}
                  indexPattern={clusterConfig.indexPattern}
                />
              </Grid>
            )}

            {/* If pattern was provided but no indices returned */}
            {clusterConfig.indexPattern && (!summary.indices || summary.indices.length === 0) && (
              <Grid item xs={12} className={classes.section}>
                <Alert severity="warning">
                  No indices currently match the pattern &quot;{clusterConfig.indexPattern}&quot; in cluster <code>{clusterConfig.instanceName}</code>.
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </Content>
    </Page>
  );
};
