import { useVersionCheck } from '@/hooks/useVersionCheck';
import { UpdateDialog } from './UpdateDialog';

export function VersionChecker() {
  const { showDialog, closeDialog, serverCommit, localCommit } = useVersionCheck();

  return (
    <UpdateDialog
      open={showDialog}
      onClose={closeDialog}
      serverCommit={serverCommit}
      localCommit={localCommit}
    />
  );
}
