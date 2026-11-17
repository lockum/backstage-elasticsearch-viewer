import React from 'react';
import { Box, Typography, makeStyles } from '@material-ui/core';
import { ClusterHealthStatus } from '../../api/types';

const useStyles = makeStyles(() => ({
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 6,
  },
  green: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    color: '#2e7d32',
    border: '1px solid rgba(46, 125, 50, 0.3)',
    '& $dot': {
      backgroundColor: '#2e7d32',
      boxShadow: '0 0 6px rgba(46, 125, 50, 0.6)',
    },
  },
  yellow: {
    backgroundColor: 'rgba(237, 108, 2, 0.12)',
    color: '#ed6c02',
    border: '1px solid rgba(237, 108, 2, 0.3)',
    '& $dot': {
      backgroundColor: '#ed6c02',
      boxShadow: '0 0 6px rgba(237, 108, 2, 0.6)',
    },
  },
  red: {
    backgroundColor: 'rgba(211, 47, 47, 0.12)',
    color: '#d32f2f',
    border: '1px solid rgba(211, 47, 47, 0.3)',
    '& $dot': {
      backgroundColor: '#d32f2f',
      boxShadow: '0 0 6px rgba(211, 47, 47, 0.6)',
    },
  },
}));

export interface StatusBadgeProps {
  status: ClusterHealthStatus;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const classes = useStyles();
  const safeStatus = status === 'green' || status === 'yellow' || status === 'red' ? status : 'red';
  const statusClass = classes[safeStatus];

  return (
    <Box className={`${classes.badge} ${statusClass}`} aria-label={`Cluster status: ${safeStatus}`}>
      <span className={classes.dot} />
      <Typography variant="caption" component="span" style={{ fontWeight: 'bold' }}>
        {label || safeStatus}
      </Typography>
    </Box>
  );
};
