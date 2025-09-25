import React from 'react';
import { Typography, Grid, Card, CardContent, Box } from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Room as RoomIcon,
  Person as PersonIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const stats = [
    { title: 'Active Timetables', value: '3', icon: <ScheduleIcon /> },
    { title: 'Venues', value: '25', icon: <RoomIcon /> },
    { title: 'Lecturers', value: '45', icon: <PersonIcon /> },
    { title: 'Courses', value: '120', icon: <SchoolIcon /> },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to AI Timetabler. Manage your academic scheduling with intelligent automation.
      </Typography>
      
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box color="primary.main">{stat.icon}</Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;