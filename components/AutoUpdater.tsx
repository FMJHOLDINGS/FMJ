import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';

export default function AutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // ඇප් එක ඕපන් කරපු ගමන් Update එකක් තියෙනවද බලනවා
    if ((window as any).__TAURI_INTERNALS__) {
      checkForUpdates();
    }
  }, []);

  async function checkForUpdates() {
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setUpdateAvailable(true); // Update එකක් ඇවිත් නම් තිරය වසා දමයි
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  }

  async function startUpdate() {
    if (!updateInfo) return;
    setIsUpdating(true);
    try {
      // ඩවුන්ලෝඩ් කර ඉන්ස්ටෝල් කිරීම අරඹයි
      await updateInfo.downloadAndInstall();
      setIsUpdating(false);
      setIsFinished(true);
      // සාමාන්‍යයෙන් Tauri මෙතැනදී ඉබේම ඇප් එක Restart කරයි
    } catch (error) {
      console.error("Update failed:", error);
      setIsUpdating(false);
    }
  }

  // Update එකක් නැත්නම් මුකුත් පෙන්වන්නේ නැතිව සාමාන්‍ය විදිහට ඇප් එක වැඩ කරයි
  if (!updateAvailable) return null;

  return (
    // මුළු තිරයම අඳුරු කර වෙනත් කිසිම දෙයක් ක්ලික් කරන්න බැරි වෙන විදිහට Overlay එකක් සෑදීම
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
        {!isFinished ? (
          <>
            <div className="mb-4">
              <span className="text-5xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">අනිවාර්ය Update එකක් ඇත!</h3>
            <p className="text-sm text-gray-600 mb-8">
              සිස්ටම් එකේ ආරක්ෂාව සහ නව පහසුකම් සඳහා <b>{updateInfo?.version}</b> සංස්කරණයට අනිවාර්යයෙන්ම Update කළ යුතුයි. කරුණාකර පහත Button එක click කරන්න.
            </p>
            
            {/* මෙහි Cancel Button එකක් නොමැත. ඇත්තේ Update Button එක පමණි */}
            <button
              onClick={startUpdate}
              disabled={isUpdating}
              className="w-full py-3 px-4 text-base font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-all shadow-lg hover:shadow-blue-600/30"
            >
              {isUpdating ? 'Downloading & Installing...' : 'දැන්ම Update කරන්න'}
            </button>
            
            {isUpdating && (
              <p className="text-xs text-gray-500 mt-4 animate-pulse">
                කරුණාකර රැඳී සිටින්න. මෙය ස්වයංක්‍රීයව සිදුවේ...
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <span className="text-5xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Update එක සාර්ථකයි!</h3>
            <p className="text-sm text-gray-600">
              අලුත් සංස්කරණය සාර්ථකව Install විය. මෘදුකාංගය දැන් ස්වයංක්‍රීයව නැවත Open වේවි. එසේ නොවුණහොත් කරුණාකර ඇප් එක Close කර නැවත Open කරන්න.
            </p>
          </>
        )}
      </div>
    </div>
  );
}