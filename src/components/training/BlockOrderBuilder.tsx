import { useState, useRef, useCallback } from 'react';
import { GripVertical, Plus, X, Layers } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export interface BlockType {
  id: string;
  name: string;
  color: string;
}

export interface BlockInstance {
  instanceId: string;
  typeId: string;
  name: string;
  color: string;
}

interface BlockOrderBuilderProps {
  availableBlocks: BlockType[];
  orderedBlocks: BlockInstance[];
  onChange: (blocks: BlockInstance[]) => void;
  language: string;
}

export default function BlockOrderBuilder({
  availableBlocks,
  orderedBlocks,
  onChange,
  language,
}: BlockOrderBuilderProps) {
  const t = (es: string, en: string) => (language === 'es' ? es : en);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const colorClasses: Record<string, string> = {
    green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10',
    blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10',
    orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10',
  purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/10',
    gray: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/10',
  yellow: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10',
  red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10',
  pink: 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-900/10',
  indigo: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/10',
  teal: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/10',
  cyan: 'border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-900/10',
    lime: 'border-lime-200 bg-lime-50 dark:border-lime-800 dark:bg-lime-900/10',
    emerald: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10',
    amber: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10',
    rose: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/10',
    slate: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/10',
    fuchsia: 'border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-900/10',
    violet: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/10',
  };

  const getColorClass = (color: string) => colorClasses[color] || colorClasses.blue;

  const generateInstanceId = () => `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const addBlock = (blockType: BlockType) => {
    const newInstance: BlockInstance = {
      instanceId: generateInstanceId(),
      typeId: blockType.id,
      name: blockType.name,
      color: blockType.color,
    };
    onChange([...orderedBlocks, newInstance]);
  };

  const removeBlock = (instanceId: string) => {
    onChange(orderedBlocks.filter(b => b.instanceId !== instanceId));
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newBlocks = [...orderedBlocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(dropIndex, 0, moved);
    onChange(newBlocks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [orderedBlocks, onChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback(() => {
    dragCounter.current++;
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Available Blocks Palette */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#fdda36]" />
          {t('Bloques disponibles', 'Available blocks')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {availableBlocks.map((block, i) => (
            <button
              key={block.id}
              onClick={() => addBlock(block)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${getColorClass(block.color)}`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 text-left truncate">
                {block.name}
              </span>
              <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Session Order List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('Orden de la sesión', 'Session order')}
        </h3>
        {orderedBlocks.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Layers className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('Arrastra o haz clic en un bloque arriba para agregarlo', 'Click a block above to add it to the session')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedBlocks.map((block, index) => (
              <div
                key={block.instanceId}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  getColorClass(block.color)
                } ${
                  draggedIndex === index
                    ? 'opacity-40 scale-[0.98]'
                    : ''
                } ${
                  dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                    ? 'ring-2 ring-[#fdda36] ring-offset-1'
                    : ''
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Position number */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300">
                  {index + 1}
                </span>

                {/* Block name */}
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {block.name}
                </span>

                {/* Instance badge if duplicate type */}
                {orderedBlocks.filter(b => b.typeId === block.typeId).length > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    #{orderedBlocks.filter(b => b.typeId === block.typeId).findIndex(b => b.instanceId === block.instanceId) + 1}
                  </span>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeBlock(block.instanceId)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                  title={t('Eliminar', 'Remove')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
