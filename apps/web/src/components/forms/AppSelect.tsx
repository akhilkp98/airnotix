import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';

export type AppSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type AppSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly AppSelectOption<T>[];
  onChange: (value: T) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

export function AppSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  id,
  name,
  required,
  disabled,
  error,
  helperText,
  fullWidth,
  sx,
}: AppSelectProps<T>) {
  return (
    <TextField
      id={id}
      name={name}
      select
      label={label}
      value={value}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      sx={sx}
      onChange={(event) => {
        const next = options.find((option) => option.value === event.target.value);
        if (next) onChange(next.value);
      }}
      slotProps={{
        select: {
          MenuProps: {
            marginThreshold: 8,
            slotProps: {
              paper: { sx: { maxHeight: 320 } },
            },
          },
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value === '' ? `empty-${option.label}` : option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
