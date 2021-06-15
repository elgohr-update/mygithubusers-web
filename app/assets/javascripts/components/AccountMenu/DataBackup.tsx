import { isDesktopApplication } from '@/utils';
import { alertDialog } from '@Services/alertService';
import {
  STRING_IMPORT_SUCCESS,
  STRING_INVALID_IMPORT_FILE,
  STRING_UNSUPPORTED_BACKUP_FILE_VERSION,
  StringImportError
} from '@/strings';
import { BackupFile } from '@standardnotes/snjs';
import { useState } from 'preact/hooks';
import { WebApplication } from '@/ui_models/application';
import { JSXInternal } from 'preact/src/jsx';
import TargetedEvent = JSXInternal.TargetedEvent;
import { StateUpdater } from 'preact/hooks';
import { FunctionalComponent } from 'preact';

type Props = {
  application: WebApplication;
  isBackupEncrypted: boolean;
  isEncryptionEnabled: boolean;
  setIsBackupEncrypted: StateUpdater<boolean>;
}

const DataBackup: FunctionalComponent<Props> = ({
                                                  application,
                                                  isBackupEncrypted,
                                                  isEncryptionEnabled,
                                                  setIsBackupEncrypted
                                                }) => {

  const [isImportDataLoading, setIsImportDataLoading] = useState(false);

  const downloadDataArchive = () => {
    application.getArchiveService().downloadBackup(isBackupEncrypted);
  };

  const readFile = async (file: File): Promise<any> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target!.result as string);
          resolve(data);
        } catch (e) {
          application.alertService.alert(STRING_INVALID_IMPORT_FILE);
        }
      };
      reader.readAsText(file);
    });
  };

  const performImport = async (data: BackupFile) => {
    setIsImportDataLoading(true);

    const result = await application.importData(data);

    setIsImportDataLoading(false);

    if (!result) {
      return;
    }

    let statusText = STRING_IMPORT_SUCCESS;
    if ('error' in result) {
      statusText = result.error;
    } else if (result.errorCount) {
      statusText = StringImportError(result.errorCount);
    }
    void alertDialog({
      text: statusText
    });
  };

  const importFileSelected = async (event: TargetedEvent<HTMLInputElement, Event>) => {
    const { files } = (event.target as HTMLInputElement);

    if (!files) {
      return;
    }
    const file = files[0];
    const data = await readFile(file);
    if (!data) {
      return;
    }

    const version = data.version || data.keyParams?.version || data.auth_params?.version;
    if (!version) {
      await performImport(data);
      return;
    }

    if (
      application.protocolService.supportedVersions().includes(version)
    ) {
      await performImport(data);
    } else {
      setIsImportDataLoading(false);
      void alertDialog({ text: STRING_UNSUPPORTED_BACKUP_FILE_VERSION });
    }
  };

  return (
    <>
      {isImportDataLoading ? (
        <div className="sk-spinner small info" />
      ) : (
        <div className="sk-panel-section">
          <div className="sk-panel-section-title">Data Backups</div>
          <div className="sk-p">Download a backup of all your data.</div>
          {isEncryptionEnabled && (
            <form className="sk-panel-form sk-panel-row">
              <div className="sk-input-group">
                <label className="sk-horizontal-group tight">
                  <input
                    type="radio"
                    onChange={() => setIsBackupEncrypted(true)}
                    checked={isBackupEncrypted}
                  />
                  <p className="sk-p">Encrypted</p>
                </label>
                <label className="sk-horizontal-group tight">
                  <input
                    type="radio"
                    onChange={() => setIsBackupEncrypted(false)}
                    checked={!isBackupEncrypted}
                  />
                  <p className="sk-p">Decrypted</p>
                </label>
              </div>
            </form>
          )}
          <div className="sk-panel-row" />
          <div className="flex">
            <button className="sn-button small info" onClick={downloadDataArchive}>Download Backup</button>
            <label className="sn-button small flex items-center info ml-2">
              <input
                type="file"
                onChange={importFileSelected}
                style={{ display: 'none' }}
              />
              Import Backup
            </label>
          </div>
          {isDesktopApplication() && (
            <p className="mt-5">
              Backups are automatically created on desktop and can be managed
              via the "Backups" top-level menu.
            </p>
          )}
          <div className="sk-panel-row" />
        </div>
      )}
    </>
  );
};

export default DataBackup;
