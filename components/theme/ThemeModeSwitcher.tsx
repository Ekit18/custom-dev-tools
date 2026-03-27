"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { useThemeMode } from "@/components/theme/AppThemeProvider";
import type { ThemeMode } from "@/lib/theme-preference";

export default function ThemeModeSwitcher() {
  const { selectedMode, setSelectedMode } = useThemeMode();

  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    mode: ThemeMode | null,
  ) => {
    if (!mode) return;
    setSelectedMode(mode);
  };

  return (
    <ToggleButtonGroup
      size="small"
      value={selectedMode}
      exclusive
      onChange={handleChange}
      aria-label="Theme mode switcher"
      color="primary"
    >
      <Tooltip title="System theme">
        <ToggleButton value="system" aria-label="System theme">
          <SettingsBrightnessIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Light theme">
        <ToggleButton value="light" aria-label="Light theme">
          <LightModeIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Dark theme">
        <ToggleButton value="dark" aria-label="Dark theme">
          <DarkModeIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
