import Navigation from '@/components/Navigation';
import { Box } from '@mui/material';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </>
  );
}
