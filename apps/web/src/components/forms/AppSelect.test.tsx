// @vitest-environment happy-dom
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../../theme/theme';
import { chooseOption } from '../../test/chooseOption';
import { AppSelect } from './AppSelect';

const options = [
  { value: '', label: 'Choose' },
  { value: 'active', label: 'Active' },
  { value: 'hold', label: 'On Hold' },
] as const;

function Harness({
  disabled = false,
  error = false,
  helperText = '',
  required = false,
}: {
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState('');
  return (
    <ThemeProvider theme={theme}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          (event.currentTarget as HTMLFormElement).dataset.submitted = String(data.get('status') ?? '');
        }}
      >
        <AppSelect
          id="status"
          name="status"
          label="Status"
          value={value}
          options={options}
          onChange={setValue}
          disabled={disabled}
          error={error}
          helperText={helperText}
          required={required}
        />
        <button type="submit">Save</button>
      </form>
    </ThemeProvider>
  );
}

describe('AppSelect', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  it('keeps the current value, lists the options, and submits the chosen value', async () => {
    render(<Harness />);
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    expect(await screen.findByRole('option', { name: 'Choose' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Active' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'On Hold' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    await chooseOption('Status', 'On Hold');
    expect(screen.getByRole('combobox', { name: 'Status' }).textContent).toContain('On Hold');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('form')?.dataset.submitted).toBe('hold');
  });

  it('shows required, disabled, and error states', () => {
    render(<Harness required disabled error helperText="Status is required." />);
    const field = screen.getByRole('combobox', { name: /Status/ });
    expect(field.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Status is required.')).toBeTruthy();
    expect(document.querySelector('.Mui-error')).toBeTruthy();
  });
});
