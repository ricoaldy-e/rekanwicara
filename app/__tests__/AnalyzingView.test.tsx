import { render, screen } from '@testing-library/react-native';

import { AnalyzingView } from '../src/components/AnalyzingView';

describe('AnalyzingView', () => {
  it('shows only the upload as in progress while sending, and says the recording is deleted', async () => {
    await render(<AnalyzingView fraction={0.4} />);
    expect(screen.getByText('Menganalisis…')).toBeTruthy();
    expect(screen.getByLabelText('Mengirim rekaman, sedang berjalan')).toBeTruthy();
    expect(screen.getByLabelText('Menilai bentuk bibir, menunggu')).toBeTruthy();
    expect(screen.getByLabelText('Menilai suara, menunggu')).toBeTruthy();
    expect(screen.getByText(/Rekaman dihapus setelah dianalisis/)).toBeTruthy();
  });

  it('marks the upload done and lip scoring in progress once it is sent', async () => {
    await render(<AnalyzingView fraction={1} />);
    expect(screen.getByLabelText('Rekaman terkirim, selesai')).toBeTruthy();
    expect(screen.getByLabelText('Menilai bentuk bibir, sedang berjalan')).toBeTruthy();
    expect(screen.getByLabelText('Menilai suara, menunggu')).toBeTruthy();
  });

  it('mentions a retried upload', async () => {
    await render(<AnalyzingView fraction={0} attempt={2} />);
    expect(screen.getByText('Percobaan ke-2')).toBeTruthy();
  });
});
