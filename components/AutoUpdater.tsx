import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';

export default function AutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // මේකෙන් කරන්නේ .exe එකක් ඇතුළේ ඉන්නවා නම් විතරක් Update එකක් තියෙනවද බලන එකයි
    if ((window as any).__TAURI_INTERNALS__) {
      checkForUpdates();
    }
  }, []);

  async function checkForUpdates() {
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  }

  async function startUpdate() {
    if (!updateInfo) return;
    setIsUpdating(true);
    try {
      // අප්ඩේට් එක ඩවුන්ලෝඩ් කරලා ඉන්ස්ටෝල් කරන කමාන්ඩ් එක
      await updateInfo.downloadAndInstall();
      setIsUpdating(false);
      setIsFinished(true); 
    } catch (error) {
      console.error("Update failed:", error);
      setIsUpdating(false);
    }
  }

  // අප්ඩේට් එකක් නැත්නම් මුකුත් පෙන්වන්න එපා
  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-5 right-5 bg-white p-6 rounded-lg shadow-2xl border border-gray-200 z-[9999] w-80">
      {!isFinished ? (
        <>
          <h3 className="text-lg font-bold text-gray-800 mb-2">අලුත් Update එකක් ඇත! 🎉</h3>
          <p className="text-sm text-gray-600 mb-4">
            FMJ Pro හි <b>{updateInfo?.version}</b> සංස්කරණය දැන් ලබා ගත හැක. අලුත් පහසුකම් සඳහා දැන්ම Update කරගන්න.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUpdateAvailable(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              disabled={isUpdating}
            >
              පසුවට
            </button>
            <button
              onClick={startUpdate}
              disabled={isUpdating}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isUpdating ? 'Downloading...' : 'දැන් Install කරන්න'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold text-green-600 mb-2">Update එක සාර්ථකයි! ✅</h3>
          <p className="text-sm text-gray-600 mb-4">
            අලුත් සංස්කරණය සාර්ථකව Install විය. වෙනස්කම් බලාගැනීම සඳහා කරුණාකර ඇප් එක Close කර නැවත Open කරන්න.
          </p>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="w-full px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            හරි (OK)
          </button>
        </>
      )}
    </div>
  );
}