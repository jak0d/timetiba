import React, { useEffect, useState } from 'react';
import { Box, Alert, AlertTitle } from '@mui/material';
import { TimetableContainer } from './TimetableContainer';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { useScheduleStore } from '../../store/scheduleStore';
import { ConnectionStatus } from '../common/ConnectionStatus';

export interface RealTimeTimetableContainerProps {
  scheduleId?: string;
  showConnectionStatus?: boolean;
}

export const RealTimeTimetableContainer: React.FC<RealTimeTimetableContainerProps> = ({
  scheduleId,
  showConnectionStatus = true,
}) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  const { isConnected } = useRealTimeUpdates({
    scheduleId,
    enableTimetableUpdates: true,
    enableConflictResolution: true,
  });

  const { selectedSchedule, lastUpdated } = useScheduleStore();

  // Track when the schedule was last updated
  useEffect(() => {
    if (lastUpdated && lastUpdated !== lastUpdateTime) {
      setLastUpdateTime(lastUpdated);
      setUpdateCount(prev => prev + 1);
    }
  }, [lastUpdated, lastUpdateTime]);

  return (
    <Box>
      {showConnectionStatus && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {lastUpdateTime && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                <AlertTitle sx={{ mb: 0 }}>Last Updated</AlertTitle>
                {lastUpdateTime.toLocaleTimeString()} ({updateCount} updates)
              </Alert>
            )}
          </Box>
          <ConnectionStatus variant="chip" />
        </Box>
      )}

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Real-time Updates Unavailable</AlertTitle>
          You may not see the latest changes to the timetable. Please refresh the page manually.
        </Alert>
      )}

      <TimetableContainer scheduleId={scheduleId} />
    </Box>
  );
};