'use client';

import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  Chip
} from '@mui/material';

interface ScopeSelectorProps {
  title: string;
  scopes: string[];
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
}

export default function ScopeSelector({
  title,
  scopes,
  selectedScopes,
  onChange
}: ScopeSelectorProps) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Autocomplete
        multiple
        options={scopes}
        value={selectedScopes}
        onChange={(event, newValue) => {
          onChange(newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Search and select scopes"
            placeholder="Type to search..."
            helperText={`${selectedScopes.length} scope(s) selected`}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              key={option}
              size="small"
            />
          ))
        }
        filterSelectedOptions
        disableCloseOnSelect
        sx={{
          '& .MuiAutocomplete-tag': {
            maxWidth: 'calc(100% - 6px)'
          }
        }}
      />
    </Paper>
  );
}
