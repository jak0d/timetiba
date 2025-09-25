import React from 'react';
import { Typography, Box } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Configure AI optimization parameters and system preferences.
      </Typography>
      {/* Settings components will be implemented in task 11.4 */}
    </Box>
  );
};

export default Settings;