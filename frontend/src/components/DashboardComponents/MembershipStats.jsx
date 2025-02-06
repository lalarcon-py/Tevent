import React from 'react';
import { Typography, Box } from '@mui/material';
import { Sector, PieChart, Pie } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const RADIAN = Math.PI / 180;

const MembershipStats = ({ data }) => {
  if (!data) return <Typography>Loading membership stats...</Typography>;

  const pieData = Object.entries(data.role_distribution || {}).map(([name, value]) => ({
    name,
    value: Number(value)
  }));

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${name} (${value})`}
      </text>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Membership Overview
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Typography>Total Members: {data.total_members}</Typography>
        <Typography>Active Members: {data.active_members}</Typography>
        <Typography>New Members (30d): {data.new_members_30d}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', height: 300 }}>
        <PieChart width={400} height={300}>
          <Pie
            data={pieData}
            cx={200}
            cy={150}
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Sector key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </Box>
    </Box>
  );
};

export default MembershipStats;