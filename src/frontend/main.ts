import { joinAllowlist } from './app';

const joinButton = document.getElementById('joinButton') as HTMLButtonElement | null;
const secretInput = document.getElementById('secretCode') as HTMLInputElement | null;
const status = document.getElementById('status') as HTMLDivElement | null;

if (joinButton && secretInput && status) {
  joinButton.addEventListener('click', async () => {
    const value = secretInput.value;
    status.textContent = 'Submitting your private join request...';
    try {
      const result = await joinAllowlist(value);
      status.textContent = `${result.message}\nStatus: ${result.status}`;
    } catch (error) {
      status.textContent = `Error: ${error instanceof Error ? error.message : error}`;
    }
  });
}
