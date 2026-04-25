import { Save, ArrowLeft } from 'lucide-react';

interface ProgramHeaderProps {
  programTitle: string;
  onSave: () => void;
  saving: boolean;
}

export default function ProgramHeader({ programTitle, onSave, saving }: ProgramHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'program-builder' }))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
              {programTitle}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
              Program Builder
            </p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#fdda36] text-[#514163] rounded-lg hover:bg-[#fde66e] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Program'}
        </button>
      </div>
    </div>
  );
}
