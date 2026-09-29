import { fireEvent, screen, within } from '@testing-library/react';

export async function chooseOption(label: string | RegExp, optionName: string | RegExp) {
  const combobox = screen.getByRole('combobox', { name: label });
  fireEvent.mouseDown(combobox);
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: optionName }));
  if (screen.queryByRole('listbox')) {
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
  }
}
