import { Card, type CardProps } from '@mui/material';
import { tokens } from '../theme/tokens';

/** Contenedor informativo: radio contenido, no “píldora”. */
export default function InfoCard({ sx, ...props }: CardProps) {
  return (
    <Card
      {...props}
      sx={{
        borderRadius: `${tokens.radiusInfo}px`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        ...sx,
      }}
    />
  );
}
