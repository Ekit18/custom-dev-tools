"use client";

import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography,
} from "@mui/material";

export type PackOption = {
  id: string;
  slug: string;
  name: string;
  source: "UPLOADED" | "BUILT_IN";
  status: string;
  description: string | null;
};

type Props = {
  packs: PackOption[];
  value: string;
  onChange: (packId: string) => void;
  disabled?: boolean;
};

export default function MockPackTopicSelect({
  packs,
  value,
  onChange,
  disabled,
}: Props) {
  const handle = (e: SelectChangeEvent<string>) => {
    onChange(e.target.value);
  };

  const active = packs.filter((p) => p.status === "ACTIVE");

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel id="mock-pack-label">Mock data pack</InputLabel>
      <Select
        labelId="mock-pack-label"
        label="Mock data pack"
        value={value}
        onChange={handle}
      >
        {active.length === 0 ? (
          <MenuItem value="" disabled>
            No active packs — upload one under Dashboard → Mock packs
          </MenuItem>
        ) : (
          active.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2">{p.name}</Typography>
                  <Chip
                    size="small"
                    label={p.source === "BUILT_IN" ? "Built-in" : "Uploaded"}
                    color={p.source === "BUILT_IN" ? "secondary" : "primary"}
                    variant="outlined"
                  />
                </Box>
                {p.description ? (
                  <Typography variant="caption" color="text.secondary">
                    {p.description}
                  </Typography>
                ) : null}
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
}
